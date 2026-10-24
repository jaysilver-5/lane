import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { withWebBasePath } from '../src/domain/webLocation.mjs';

test('browser links preserve checkout queries and stay within the app mount', () => {
  assert.equal(withWebBasePath('/'), '/app');
  assert.equal(withWebBasePath('/checkout?payment=returned'), '/app/checkout?payment=returned');
  assert.equal(withWebBasePath('/auth/callback?next=%2Fcheckout'), '/app/auth/callback?next=%2Fcheckout');
  assert.equal(withWebBasePath('/auth/sign-in', ''), '/auth/sign-in');
  for (const path of ['https://other.example', '//other.example', '/\\other.example', '/auth\ncallback']) {
    assert.throws(() => withWebBasePath(path), /app-relative/);
  }
});

test('real checkout returns to the same browser origin under /app', async () => {
  const source = readFileSync(new URL('../src/lib/paddle.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exported = {}, checkouts = [];
  const paddle = { Initialize() {}, Checkout: { open: options => checkouts.push(options) } };
  const location = { origin: 'https://www.getfirstlane.com', href: 'https://www.getfirstlane.com/app/checkout' };
  const client = { functions: { invoke: async () => ({ data: { transactionId: 'txn_' + 'a'.repeat(26), environment: 'live' } }) } };
  vm.runInNewContext(js, {
    exports: exported,
    require: name => name === './webLocation' ? { appWebPath: withWebBasePath } : { authenticatedClient: async () => ({ client }) },
    process: { env: { EXPO_PUBLIC_PADDLE_CLIENT_TOKEN: 'live_fixture', EXPO_PUBLIC_PADDLE_ENVIRONMENT: 'live' } },
    URL, setTimeout, clearTimeout,
    window: { location, Paddle: paddle, history: { replaceState() {} } },
    document: { createElement: () => ({ remove() {} }), head: { appendChild: script => script.onload() } },
  });
  await exported.webPurchase('fixture');
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].settings.successUrl, 'https://www.getfirstlane.com/app/checkout?payment=returned');
});
