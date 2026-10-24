import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as clerk from '../supabase/functions/_shared/clerk.mjs';

const origin = 'https://app.firstlane.test';
const issuer = 'https://delete.clerk.firstlane.test';
const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'delete-fixture-key', alg: 'RS256', use: 'sig' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function signed(changes = {}) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${encode({ alg: 'RS256', kid: jwk.kid })}.${encode({ iss: issuer, sub: 'user_Disposable', sid: 'sess_Disposable', azp: origin, iat: now, exp: now + 60, fva: [0, -1], ...changes })}`;
  return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(data))).toString('base64url')}`;
}
const source = fs.readFileSync(new URL('../supabase/functions/_shared/delete-clerk-account.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function fixture({ databaseFails = false, clerkFails = false, verified = true, sessionStatus = 'active' } = {}) {
  const calls = [];
  const env = { WEB_APP_ORIGIN: origin, CLERK_ISSUER_URL: issuer, CLERK_SECRET_KEY: 'test-server-key', CLERK_AUTHORIZED_PARTIES: origin, SUPABASE_URL: 'https://project.firstlane.test', SUPABASE_SERVICE_ROLE_KEY: 'test-backend-key' };
  const fetcher = async (url, options = {}) => {
    if (url === issuer + '/.well-known/jwks.json') return Response.json({ keys: [jwk] });
    assert.equal(options.headers.Authorization, 'Bearer test-server-key');
    if (url === 'https://api.clerk.com/v1/sessions/sess_Disposable') return Response.json({ status: sessionStatus, user_id: 'user_Disposable' });
    assert.equal(url, 'https://api.clerk.com/v1/users/user_Disposable');
    if (options.method === 'DELETE') {
      calls.push('clerk-delete');
      return clerkFails ? Response.json({ error: 'upstream unavailable' }, { status: 503 }) : Response.json({ id: 'user_Disposable', deleted: true });
    }
    return Response.json({ id: 'user_Disposable', primary_email_address_id: 'email_fixture', email_addresses: [{ id: 'email_fixture', email_address: 'disposable@example.test', verification: { status: verified ? 'verified' : 'unverified' } }] });
  };
  const imports = {
    'npm:@supabase/supabase-js@2.117.2': { createClient(url, key) {
      assert.equal(url, env.SUPABASE_URL); assert.equal(key, env.SUPABASE_SERVICE_ROLE_KEY);
      return { async rpc(name, args) {
        calls.push('database-disable');
        assert.equal(name, 'firstlane_delete_clerk_account');
        assert.equal(args.p_issuer, issuer); assert.equal(args.p_subject, 'user_Disposable');
        return databaseFails ? { data: null, error: new Error('database unavailable') } : { data: { disabled: true }, error: null };
      } };
    } },
    './clerk.mjs': { ...clerk,
      verifyClerkRequest: (req, getEnv, options) => clerk.verifyClerkRequest(req, getEnv, { ...options, fetcher }),
      clerkRequest: (path, settings, options) => clerk.clerkRequest(path, settings, { ...options, fetcher }),
    },
  };
  const context = { exports: {}, Request, Response, Deno: { env: { get: name => env[name] } }, require: name => { assert.ok(name in imports); return imports[name]; } };
  vm.runInNewContext(js, context);
  return { calls, handler: context.exports.deleteClerkAccount };
}
async function request({ body = '{"confirmation":"DELETE"}', claims, token, requestOrigin = origin, method = 'POST' } = {}) {
  const headers = { origin: requestOrigin, 'content-type': 'application/json' };
  if (token !== false) headers.authorization = `Bearer ${token || await signed(claims)}`;
  return new Request(origin + '/functions/v1/delete-account', { method, headers, ...(method === 'POST' ? { body } : {}) });
}

test('deletion authenticates signed identity, disables app data first, then removes Clerk identity', async () => {
  const f = fixture(); const response = await f.handler(await request({ body: '{"confirmation":"DELETE","user_id":"user_Other"}' }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { deleted: true });
  assert.deepEqual(f.calls, ['database-disable', 'clerk-delete']);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});

test('bad confirmation, malformed JSON, null and oversized bodies are client errors without mutation', async () => {
  for (const body of ['{}', '{"confirmation":"delete"}', '{', 'null', '"DELETE"', ' '.repeat(1025)]) {
    const f = fixture(); const response = await f.handler(await request({ body }));
    assert.equal(response.status, 400, body.slice(0, 40)); assert.deepEqual(f.calls, []);
  }
});

test('deletion rejects foreign origin, unsigned/forged and revoked sessions without mutation', async () => {
  for (const options of [{ requestOrigin: 'https://foreign.test' }, { token: false }, { token: 'forged.token.signature' }, { claims: { azp: 'https://foreign.test' } }]) {
    const f = fixture(); assert.ok([401, 403].includes((await f.handler(await request(options))).status)); assert.deepEqual(f.calls, []);
  }
  const f = fixture({ sessionStatus: 'revoked' }); assert.equal((await f.handler(await request())).status, 401); assert.deepEqual(f.calls, []);
});

test('deletion requires recent first-factor authentication', async () => {
  for (const fva of [undefined, [], [-1, -1], [11, -1], ['0', -1]]) {
    const f = fixture(); assert.equal((await f.handler(await request({ claims: { fva } }))).status, 403); assert.deepEqual(f.calls, []);
  }
});

test('unverified users can remove their own account after recent authentication', async () => {
  const f = fixture({ verified: false }); assert.equal((await f.handler(await request())).status, 200); assert.deepEqual(f.calls, ['database-disable', 'clerk-delete']);
});

test('database failure prevents external deletion; Clerk failure remains retryable and never reports success', async () => {
  const database = fixture({ databaseFails: true }); assert.equal((await database.handler(await request())).status, 503); assert.deepEqual(database.calls, ['database-disable']);
  const upstream = fixture({ clerkFails: true }); assert.equal((await upstream.handler(await request())).status, 503); assert.deepEqual(upstream.calls, ['database-disable', 'clerk-delete']);
});

test('preflight and unsupported methods do not modify accounts', async () => {
  for (const [method, status] of [['OPTIONS', 204], ['GET', 405]]) {
    const f = fixture(); assert.equal((await f.handler(await request({ method }))).status, status); assert.deepEqual(f.calls, []);
  }
});
