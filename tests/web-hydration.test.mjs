import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { withWebBasePath } from '../src/domain/webLocation.mjs';

const element = (type, props) => ({ type, props: props || {} });
function load(path, imports, globals = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports: {}, require: name => {
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' };
    if (name === './webLocation') return { appWebPath: withWebBasePath };
    assert.ok(name in imports, `Unexpected import ${name}`); return imports[name];
  }, ...globals };
  vm.runInNewContext(js, context); return context.exports;
}
function hooks() {
  const slots = [], effects = [];
  let index = 0, changed = true;
  const memo = (value, deps) => {
    const slot = index++, prior = slots[slot];
    if (!prior || deps.some((dep, i) => !Object.is(dep, prior.deps[i]))) slots[slot] = { value: value(), deps };
    return slots[slot].value;
  };
  return {
    react: {
      createContext: () => ({ Provider: 'Provider' }), useContext() {},
      useRef: initial => { const slot = index++; return slots[slot] ||= { current: initial }; },
      useCallback: (fn, deps) => memo(() => fn, deps),
      useState(initial) {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
        return [slots[slot], value => {
          const next = typeof value === 'function' ? value(slots[slot]) : value;
          if (!Object.is(next, slots[slot])) { slots[slot] = next; changed = true; }
        }];
      },
      useEffect(callback, deps) {
        const slot = index++, prior = slots[slot];
        if (!prior || deps.some((dep, i) => !Object.is(dep, prior.deps[i]))) {
          slots[slot] = { deps }; effects.push(() => { prior?.cleanup?.(); slots[slot].cleanup = callback(); });
        }
      },
    },
    render(component) { index = 0; changed = false; const tree = component(); effects.splice(0).forEach(effect => effect()); return tree; },
    get changed() { return changed; },
  };
}
const session = (subject = 'user_A', id = 'sess_A') => ({ id, status: 'active', user: { id: subject }, getToken: async () => null });
function accountBridge() {
  const h = hooks(), binding = load('../src/lib/clerkSession.ts', {}), requests = [], timers = new Map();
  let timerId = 0;
  let currentSession, isLoaded = false, tree;
  const bridge = load('../src/lib/webAccount.web.tsx', {
    react: h.react,
    '@clerk/react': { ClerkProvider: 'ClerkProvider', useSession: () => ({ session: currentSession, isLoaded }), useUser: () => ({ user: null }), useClerk: () => ({ signOut: async () => {} }) },
    '../config': { config: { mode: 'connected' } }, './clerkSession': binding,
    './supabase': { humanError: error => error.message, bootstrapClerkAccount: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) },
  }, { process: { env: { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_fixture' } }, setTimeout: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; }, clearTimeout: id => timers.delete(id), setInterval: () => 1, clearInterval() {}, document: { visibilityState: 'visible' }, window: { addEventListener() {}, removeEventListener() {} } });
  const component = bridge.WebAccountProvider({ children: 'screen' }).props.children;
  const render = () => { tree = h.render(() => component.type(component.props)); };
  render();
  return {
    requests, binding, get value() { return tree.props.value; },
    expireConnection() { for (const timer of timers.values()) if (timer.ms === 15000) timer.callback(); },
    async flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (h.changed) render(); } },
    async update(next, loaded = true) { currentSession = next; isLoaded = loaded; render(); await this.flush(); },
  };
}
test('active Clerk session waits for the canonical account rather than exposing a guest transition', async () => {
  const app = accountBridge(); assert.equal(app.value.ready, false);
  await app.update(session());
  assert.equal(app.value.ready, false); assert.equal(app.value.identity, null);
  app.requests[0].resolve({ id: 'account_A', confirmed: true }); await app.flush();
  assert.equal(app.value.ready, true); assert.equal(app.value.identity.id, 'account_A');
  assert.equal(app.binding.assertClerkAccount('account_A').account.id, 'account_A');
});
test('switching account hides the old owner immediately and ignores a late previous bootstrap', async () => {
  const app = accountBridge(); await app.update(session());
  await app.update(session('user_B', 'sess_B'));
  app.requests[0].resolve({ id: 'account_A', confirmed: true }); await app.flush();
  assert.equal(app.value.identity, null); assert.equal(app.value.ready, false);
  assert.throws(() => app.binding.assertClerkAccount('account_A'));
  app.requests[1].resolve({ id: 'account_B', confirmed: true }); await app.flush();
  assert.equal(app.value.identity.id, 'account_B'); assert.equal(app.value.ready, true);
  await app.update(null); assert.equal(app.value.identity, null); assert.equal(app.value.ready, true);
  assert.throws(() => app.binding.assertClerkAccount('account_B'));
});
test('bootstrap failure settles with an explicit error and can reconnect without changing the route', async () => {
  const app = accountBridge(); await app.update(session());
  app.requests[0].reject(new Error('Connection failed')); await app.flush();
  assert.equal(app.value.ready, true); assert.equal(app.value.identity, null); assert.equal(app.value.error, 'Connection failed');
  const retry = app.value.refresh();
  app.requests[1].resolve({ id: 'account_A', confirmed: true }); await retry; await app.flush();
  assert.equal(app.value.identity.id, 'account_A'); assert.equal(app.value.error, '');
});
test('Clerk reloading never exposes the previous identity, and a pending security task cannot bind', async () => {
  const app = accountBridge(); await app.update(session());
  app.requests[0].resolve({ id: 'account_A', confirmed: true }); await app.flush();
  await app.update(undefined, false); assert.equal(app.value.ready, false); assert.equal(app.value.identity, null);
  await app.update({ ...session(), status: 'pending', currentTask: { key: 'security' } });
  assert.equal(app.value.identity, null); assert.throws(() => app.binding.assertClerkAccount());
});
test('a stalled canonical connection times out without accepting its late response and retry can recover', async () => {
  const app = accountBridge(); await app.update(session());
  app.expireConnection(); await app.flush();
  assert.equal(app.value.ready, true); assert.match(app.value.error, /timed out/); assert.equal(app.value.identity, null);
  app.requests[0].resolve({ id: 'account_A', confirmed: true }); await app.flush();
  assert.equal(app.value.identity, null); assert.throws(() => app.binding.assertClerkAccount());
  const retry = app.value.refresh();app.requests[1].resolve({ id: 'account_A', confirmed: true });await retry;await app.flush();
  assert.equal(app.value.identity.id, 'account_A');assert.equal(app.value.error, '');
});
function nodes(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  return [value, ...nodes(value.props?.children)];
}
function checkout({ returned = false } = {}) {
  const h=hooks(), listeners=new Map();let resolvePending,tree;
  const app={identity:{id:'account_A',confirmed:true},access:{kind:'free'},accessLoading:false,reloadAccess:async()=>({}),notify(){}};
  const component=load('../app/checkout.tsx',{
    react:h.react,'react-native':{Platform:{OS:'web'}},
    'expo-router':{useRouter:()=>({replace(){},push(){}}),useLocalSearchParams:()=>returned?{payment:'returned'}:{}},
    '../src/state/AppState':{useApp:()=>app},'../src/config':{config:{mode:'connected',offer:{label:'CA$14.99'}}},
    '../src/lib/billing':{clearPendingPurchase:async()=>{},fetchStoreOffer:async()=>({priceString:'CA$14.99'}),pendingPurchase:()=>new Promise(resolve=>{resolvePending=resolve;}),purchasePreparation:async()=>({status:'submitted'})},
    '../src/lib/supabase':{humanError:error=>error.message},'../src/domain/access.mjs':{resolveAccess:()=>({kind:'free'})},
    '../src/components/UI':Object.fromEntries(['Button','Card','Chip','Copy','Heading','Muted','Note','Row','Screen'].map(name=>[name,name])),
  },{window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)},setInterval:()=>1,clearInterval(){}}).default;
  const render=()=>{tree=h.render(component);};render();
  return {listeners,resolvePending:value=>resolvePending(value),async flush(){for(let i=0;i<20;i++){await Promise.resolve();if(h.changed)render();}},get footer(){return tree.props.footer.props.children;}};
}
test('checkout return remains pending after a late empty local purchase-status read',async()=>{
  const page=checkout({returned:true});await page.flush();page.resolvePending(false);await page.flush();
  assert.equal(page.footer,'Check purchase status');
});
test('payment-submitted event cannot be overwritten by an earlier local purchase-status request',async()=>{
  const page=checkout();await page.flush();page.listeners.get('firstlane:payment-submitted')();
  page.resolvePending(false);await page.flush();assert.equal(page.footer,'Check purchase status');
});
test('root navigator survives hydration while its selected screen and account frame wait', () => {
  let ready = false;
  const Stack = Object.assign(() => {}, { Screen: 'Stack.Screen' });
  const root = load('../app/_layout.tsx', {
    react: {}, 'expo-router': { Stack, useRouter: () => ({}) }, 'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    'react-native': { Platform: {OS:'web'}, View: 'View', ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text' },
    '../src/state/AppState': { AppProvider: 'AppProvider', useApp: () => ({ ready, colors: {}, state: {}, access: {} }) },
    '../src/domain/availability.mjs': { sessionRequiresUpgrade: () => false }, '../content/sample-manifest.json': {},
    '../src/components/UI': Object.fromEntries(['Toast', 'Sheet', 'Muted', 'Button', 'Note'].map(name => [name, name])),
    '../src/components/WebFrame': { WebFrame: 'WebFrame' },
    '../src/lib/webAccount': { WebAccountProvider: 'WebAccountProvider', useWebAccount: () => ({ error: '' }) },
  });
  const navigation = nodes(root.default()).find(node => node.type?.name === 'Navigation');
  assert.ok(navigation);
  const first = nodes(navigation.type()).find(node => node.type === Stack);
  assert.ok(first, 'navigator must mount before the account is ready');
  const selected = first.props.screenLayout({ children: 'requested-route' });
  assert.doesNotMatch(JSON.stringify(selected.type(selected.props)), /requested-route|WebFrame/);
  ready = true;
  const next = nodes(navigation.type()).find(node => node.type === Stack);
  assert.equal(first.type, next.type); assert.equal(first.props.screenLayout, next.props.screenLayout);
  assert.match(JSON.stringify(selected.type(selected.props)), /requested-route|WebFrame/);
});
