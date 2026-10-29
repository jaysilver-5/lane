import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { authDestination } from '../src/domain/authFlow.mjs';
import { withWebBasePath } from '../src/domain/webLocation.mjs';

// Render the real component with immutable Clerk hook snapshots. No emails or
// accounts are created by these tests; every provider request is a local fixture.
function form({ newUser = false, verifyError = null, sendError = null, outcome = 'complete', task = null, next = '/membership', signedIn = false, missingFields = [] } = {}) {
  const slots = [], effects = [], calls = [], urls = [];
  let index = 0, changed = true, tree, clock = 100000;
  let signIn, signUp;
  const element = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { const next = typeof value === 'function' ? value(slots[slot]) : value; if (!Object.is(next, slots[slot])) { slots[slot] = next; changed = true; } }]; },
    useRef(initial) { const slot = index++; return slots[slot] ||= { current: initial }; },
    useEffect(callback, deps) { const slot = index++, before = slots[slot]; if (!before || deps.some((value, i) => !Object.is(value, before[i]))) { slots[slot] = deps; effects.push(callback); } },
  };
  const finalize = flow => async ({ navigate }) => { calls.push([flow + '-finalize', flow === 'sign-in' ? signIn.status : signUp.status]); navigate({ session: { status: 'active', currentTask: task }, decorateUrl: url => url }); return { error: null }; };
  signIn = {
    id: null, status: null, supportedSecondFactors: [{ strategy: 'email_code' }],
    async create(args) { calls.push(['sign-in-create', args]); signIn = { ...signIn, id: 'attempt', status: 'needs_first_factor' }; changed = true; return { error: null }; },
    emailCode: {
      async sendCode() { calls.push(['send']); return { error: sendError }; },
      async verifyCode({ code }) {
        calls.push(['verify', code]);
        if (verifyError) return { error: verifyError };
        if (newUser) return { error: { errors: [{ code: 'sign_up_if_missing_transfer' }] } };
        signIn = { ...signIn, status: outcome }; changed = true; return { error: null };
      },
    },
    mfa: {
      async sendEmailCode() { calls.push(['mfa-send']); return { error: null }; },
      async verifyEmailCode({ code }) { calls.push(['mfa-verify', code]); signIn = { ...signIn, status: 'complete' }; changed = true; return { error: null }; },
    },
    finalize: finalize('sign-in'),
  };
  signUp = {
    status: null, missingFields: [],
    async create(args) { calls.push(['sign-up-create', args]); signUp = { ...signUp, status: missingFields.length ? 'missing_requirements' : 'complete', missingFields }; changed = true; return { error: null }; },
    async update(args) { calls.push(['sign-up-update', args]); signUp = { ...signUp, status: 'complete', missingFields: [] }; changed = true; return { error: null }; },
    finalize: finalize('sign-up'),
  };
  const ui = Object.fromEntries(['Button', 'Field', 'Heading', 'Logo', 'Muted', 'Note', 'Screen'].map(name => [name, name]));
  const imports = {
    react, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    'react-native': { ActivityIndicator: 'ActivityIndicator', View: 'View' },
    '@clerk/react': { useClerk: () => ({ loaded: true }), useSession: () => ({ session: signedIn ? { status: 'active' } : null, isLoaded: true }), useSignIn: () => ({ signIn, fetchStatus: 'idle' }), useSignUp: () => ({ signUp, fetchStatus: 'idle' }) },
    'expo-router': { useRouter: () => ({ replace: url => urls.push(url), push: url => urls.push(url) }), useLocalSearchParams: () => ({ next }) },
    './UI': ui, './Checkbox': { Checkbox: 'Checkbox' },
    '../state/AppState': { useApp: () => ({ colors: { success: '#123' }, finishOnboarding() {} }) },
    '../domain/authFlow.mjs': { authDestination }, '../lib/webLocation': { appWebPath: withWebBasePath },
  };
  const source = fs.readFileSync(new URL('../src/components/WebEmailAuth.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports: {}, require: name => { assert.ok(name in imports, name); return imports[name]; }, Date: { now: () => clock }, setInterval: () => 1, clearInterval() {}, window: { location: { assign: url => urls.push(url) } } };
  vm.runInNewContext(js, context);
  function render() { index = 0; changed = false; tree = context.exports.WebEmailAuth(); for (const effect of effects.splice(0)) effect(); }
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
  function find(type, label) { const result = nodes(tree).find(node => node.type === type && (node.props.label === label || [node.props.children].flat().join('') === label)); assert.ok(result, type + ': ' + label); return result.props; }
  async function flush() { for (let pass = 0; pass < 40; pass++) { if (changed) render(); await Promise.resolve(); } }
  render();
  return {
    calls, urls, find, flush, text: () => JSON.stringify(tree),
    async fill(label, value) { find('Field', label).onChangeText(value); await flush(); },
    async press(label) { await find('Button', label).onPress(); await flush(); },
    async send() { await this.fill('Email address', 'learner@example.test'); await this.press('Continue with email'); },
    async verify() { await this.fill('Verification code', '123456'); await this.press('Verify & continue'); },
    async consent() { find('Checkbox', 'I agree to the terms and have read the privacy notice.').onChange(true); find('Checkbox', 'I am 16 or older. Where required, my parent or guardian has reviewed the terms with me.').onChange(true); await flush(); },
    advance() { clock += 61000; },
  };
}

test('existing users verify a code and finalize the same sign-in without creating another account', async () => {
  const app = form(); await app.send(); await app.verify();
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls[0])), ['sign-in-create', { identifier: 'learner@example.test', signUpIfMissing: true }]);
  assert.ok(app.calls.some(([name, status]) => name === 'sign-in-finalize' && status === 'complete'));
  assert.equal(app.calls.some(([name]) => name.startsWith('sign-up')), false);
  assert.deepEqual(app.urls, ['/app/auth/callback?next=%2Fmembership']);
});
test('new users must verify ownership and explicitly consent before signup transfer', async () => {
  const app = form({ newUser: true }); await app.send(); await app.verify();
  assert.equal(app.calls.some(([name]) => name.startsWith('sign-up')), false);
  assert.equal(app.find('Button', 'Create my free account').disabled, true);
  await app.press('Create my free account'); assert.equal(app.calls.some(([name]) => name.startsWith('sign-up')), false);
  await app.consent(); await app.press('Create my free account');
  assert.deepEqual(JSON.parse(JSON.stringify(app.calls.find(([name]) => name === 'sign-up-create'))), ['sign-up-create', { transfer: true, legalAccepted: true }]);
  assert.deepEqual(app.urls, ['/app/auth/callback?next=%2Fmembership']);
});
test('wrong or expired codes do not create accounts, finalize or navigate', async () => {
  const app = form({ verifyError: { errors: [{ code: 'form_code_incorrect', longMessage: 'Incorrect or expired code.' }] } }); await app.send(); await app.verify();
  assert.match(app.text(), /Incorrect or expired code/); assert.deepEqual(app.urls, []);
  assert.equal(app.calls.some(([name]) => name.includes('finalize') || name.startsWith('sign-up')), false);
});
test('email validation and six-digit validation prevent invalid provider calls', async () => {
  const app = form(); await app.fill('Email address', 'bad'); await app.press('Continue with email'); assert.deepEqual(app.calls, []);
  await app.send(); await app.fill('Verification code', '123'); await app.press('Verify & continue');
  assert.equal(app.calls.some(([name]) => name === 'verify'), false);
});
test('send failure stays retryable and the code form is not shown', async () => {
  const app = form({ sendError: { message: 'Email is temporarily unavailable.' } }); await app.send();
  assert.match(app.text(), /Email is temporarily unavailable/); app.find('Button', 'Continue with email'); assert.deepEqual(app.urls, []);
});
test('resend is throttled and changing email clears the entered code', async () => {
  const app = form(); await app.send(); await app.press('Resend code in 60s');
  assert.equal(app.calls.filter(([name]) => name === 'send').length, 1);
  await app.fill('Verification code', '123456'); await app.press('Use a different email');
  await app.fill('Email address', 'another@example.test'); await app.press('Continue with email');
  assert.equal(app.find('Field', 'Verification code').value, '');
  assert.equal(app.calls.findLast(([name]) => name === 'sign-in-create')[1].identifier, 'another@example.test');
});
test('password fallback keeps the email and validated destination', async () => {
  const app = form(); await app.fill('Email address', 'learner@example.test'); await app.press('Use my password instead');
  assert.deepEqual(app.urls, ['/auth/sign-in?method=password&next=%2Fmembership&email=learner%40example.test']);
});
test('external return paths are replaced with the safe app destination', async () => {
  const app = form({ next: 'https://evil.example/' }); await app.send(); await app.verify();
  assert.deepEqual(app.urls, ['/app/auth/callback?next=%2F(tabs)']);
});
test('additional email security checks cannot be skipped by a verified first factor', async () => {
  const app = form({ outcome: 'needs_second_factor' }); await app.send(); await app.verify();
  assert.deepEqual(app.urls, []); assert.ok(app.calls.some(([name]) => name === 'mfa-send'));
  await app.verify(); assert.ok(app.calls.some(([name]) => name === 'mfa-verify')); assert.equal(app.urls.length, 1);
});
test('pending session tasks cannot navigate to the account callback', async () => {
  const app = form({ task: { key: 'security' } }); await app.send(); await app.verify();
  assert.deepEqual(app.urls, []); assert.match(app.text(), /another security step/);
});
test('a restored signed-in session continues without sending another email', async () => {
  const app = form({ signedIn: true }); await app.press('Continue');
  assert.deepEqual(app.calls, []); assert.deepEqual(app.urls, ['/auth/callback?next=%2Fmembership']);
});
test('genuine missing details stay within the verified signup and finalize after completion', async () => {
  const app = form({ newUser: true, missingFields: ['first_name'] }); await app.send(); await app.verify(); await app.consent(); await app.press('Create my free account');
  assert.deepEqual(app.urls, []); await app.fill('First name', 'Learner'); await app.press('Create my free account');
  assert.equal(app.calls.filter(([name]) => name === 'sign-up-create').length, 1);
  assert.equal(app.calls.find(([name]) => name === 'sign-up-update')[1].firstName, 'Learner'); assert.equal(app.urls.length, 1);
});
