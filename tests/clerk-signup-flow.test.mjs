import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { clerkSignupStep } from '../src/domain/clerkSignup.mjs';

// Exercise the actual form with immutable Clerk hook snapshots. No credentials,
// live account creation, timers, or backend requests are involved.
function form({ outcome = 'complete', failure = null, mode = 'verify-email', initialComplete = false } = {}) {
  const slots = [], effects = [], urls = [], finalized = [], updates = [], passwords = [], codeRequests = [];
  let index = 0, changed = true, tree, currentSession = null;
  const element = (type, props) => ({ type, props: props || {} });
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], value => { const next = typeof value === 'function' ? value(slots[slot]) : value; if (!Object.is(next, slots[slot])) { slots[slot] = next; changed = true; } }];
    },
    useRef(initial) { const slot = index++; return slots[slot] ||= { current: initial }; },
    useEffect(callback, deps) {
      const slot = index++, before = slots[slot];
      if (!before || deps.some((value, i) => !Object.is(value, before[i]))) { slots[slot] = deps; effects.push(callback); }
    },
  };
  let signup;
  const methods = {
    async finalize(options) { finalized.push(signup.status); options.navigate({ session: { status: 'active' }, decorateUrl: url => url }); return { error: null }; },
    async update(details) { updates.push(details); signup = { ...signup, status: 'complete', missingFields: [], unverifiedFields: [] }; changed = true; return { error: null }; },
    async password(details) { passwords.push({ ...details, attempt: signup.id, emailVerification: signup.verifications.emailAddress.status }); signup = { ...signup, status: 'complete', hasPassword: true, missingFields: [], unverifiedFields: [] }; changed = true; return { error: null }; },
    verifications: {
      emailAddress: { status: 'unverified' },
      async verifyEmailCode() {
        if (failure) return { error: failure };
        signup = { ...signup, status: outcome === 'complete' ? 'complete' : 'missing_requirements', missingFields: outcome === 'details' ? ['first_name'] : outcome === 'password' ? ['password'] : [], unverifiedFields: [], verifications: { ...signup.verifications, emailAddress: { status: 'verified' } } };
        changed = true; return { error: null };
      },
      async sendEmailCode() { codeRequests.push(true); return { error: null }; },
    },
  };
  signup = { id: 'signup_test', emailAddress: 'person@example.test', status: initialComplete ? 'complete' : 'missing_requirements', missingFields: [], unverifiedFields: initialComplete ? [] : ['email_address'], ...methods };
  const router = { replace: url => urls.push(url), push: url => urls.push(url) };
  const ui = Object.fromEntries(['Button', 'Copy', 'Divider', 'Field', 'Heading', 'Logo', 'Muted', 'Note', 'Screen'].map(name => [name, name]));
  const imports = {
    react, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', View: 'View' },
    '@clerk/react': { HandleSSOCallback: 'HandleSSOCallback', useClerk: () => ({ loaded: true }), useSession: () => ({ session: currentSession, isLoaded: true }), useSignIn: () => ({ signIn: {} }), useSignUp: () => ({ signUp: signup, fetchStatus: 'idle' }) },
    'expo-router': { useRouter: () => router, useLocalSearchParams: () => ({ next: '/plans' }) },
    './UI': ui, './Checkbox': { Checkbox: 'Checkbox' }, './SocialAuthButton': { SocialAuthButton: 'SocialAuthButton' },
    '../state/AppState': { useApp: () => ({ finishOnboarding() {}, colors: { success: '#123' } }) },
    '../lib/webAccount.web': { clerkConfigured: true, useWebAccount: () => ({ identity: null, error: '' }) },
    '../domain/authFlow.mjs': { authDestination: value => value || '/plans' },
    '../domain/clerkSignup.mjs': { clerkSignupStep },
  };
  const source = fs.readFileSync(new URL('../src/components/WebAuth.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports: {}, require: name => { assert.ok(name in imports, `Unexpected import: ${name}`); return imports[name]; }, setTimeout: () => 1, clearTimeout() {}, window: { location: { assign: url => urls.push(url) } } };
  vm.runInNewContext(js, context);
  const component = context.exports.WebAuth({ mode });
  function render() { index = 0; changed = false; tree = component.type(component.props); for (const effect of effects.splice(0)) effect(); }
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(item => nodes(item)); return [value, ...nodes(value.props?.children)]; }
  function find(type, predicate) { const result = nodes(tree).find(node => node.type === type && predicate(node.props)); assert.ok(result, `${type} not found`); return result.props; }
  async function flush() { for (let pass = 0; pass < 20; pass++) { if (changed) render(); await Promise.resolve(); } }
  render();
  return {
    finalized, urls, updates, passwords, codeRequests, flush, find,
    text: () => JSON.stringify(tree),
    async verify() { find('Field', props => props.label === 'Verification code').onChangeText('123456'); await flush(); await find('Button', props => props.children === 'Verify & continue').onPress(); await flush(); },
    async setSession(session) { currentSession = session; changed = true; await flush(); },
  };
}

test('accepted code finalizes the replacement Clerk resource without a stale missing-details warning', async () => {
  const app = form(); await app.verify();
  assert.deepEqual(app.finalized, ['complete']);
  assert.deepEqual(app.urls, ['/auth/callback?next=%2Fplans']);
  assert.doesNotMatch(app.text(), /still needs required details|Return to signup/);
});
test('real remaining signup details are collected in the same attempt before finalization', async () => {
  const app = form({ outcome: 'details' }); await app.verify();
  assert.deepEqual(app.finalized, []); assert.deepEqual(app.urls, []);
  app.find('Field', props => props.label === 'First name').onChangeText('Learner'); await app.flush();
  await app.find('Button', props => props.children === 'Save & continue').onPress(); await app.flush();
  assert.equal(app.updates[0].firstName, 'Learner'); assert.deepEqual(app.finalized, ['complete']);
});
test('a rejected email code stays in verification and cannot finalize or redirect', async () => {
  const app = form({ failure: { message: 'That code is incorrect.' } }); await app.verify();
  assert.deepEqual(app.finalized, []); assert.deepEqual(app.urls, []);
  assert.match(app.text(), /That code is incorrect/);
});
test('an arriving active session connects once while a pending security task does not redirect', async () => {
  const app = form(); await app.setSession({ id: 'sess_pending', status: 'pending', currentTask: { key: 'security' } });
  assert.deepEqual(app.urls, []);
  await app.setSession({ id: 'sess_active', status: 'active' });
  assert.deepEqual(app.urls, ['/auth/callback?next=%2Fplans']); assert.deepEqual(app.finalized, []);
});
test('reopening an already completed signup resumes finalization without resubmitting a used code', async () => {
  const app = form({ initialComplete: true }); await app.flush();
  assert.deepEqual(app.finalized, ['complete']);
  assert.deepEqual(app.urls, ['/auth/callback?next=%2Fplans']);
});
test('the reported missing-password case resumes the verified attempt and finalizes without another email code', async () => {
  const app = form({ outcome: 'password' }); await app.verify();
  assert.deepEqual(app.finalized, []);
  app.find('Field', props => props.label === 'Choose a password').onChangeText('synthetic-test-password');
  app.find('Field', props => props.label === 'Confirm password').onChangeText('synthetic-test-password'); await app.flush();
  await app.find('Button', props => props.children === 'Save & continue').onPress(); await app.flush();
  assert.equal(app.passwords.length, 1); assert.equal(app.passwords[0].attempt, 'signup_test');
  assert.equal(app.passwords[0].emailVerification, 'verified');
  assert.equal('emailAddress' in app.passwords[0], false);
  assert.deepEqual(app.finalized, ['complete']); assert.deepEqual(app.codeRequests, []);
});
