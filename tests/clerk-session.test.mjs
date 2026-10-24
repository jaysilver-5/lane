import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function bridge(){
 const source=fs.readFileSync(new URL('../src/lib/clerkSession.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const context={exports:{}};vm.runInNewContext(js,context);return context.exports;
}
const session=(subject='user_A',sessionId='sess_A')=>({subject,sessionId,getToken:async()=>null});
test('a bound Clerk session only permits its canonical account',()=>{const b=bridge(),a=session();b.setClerkSession(a);b.bindClerkAccount('account_A',a);assert.equal(b.assertClerkAccount('account_A').account.id,'account_A');assert.throws(()=>b.assertClerkAccount('account_B'));});
test('late account bootstrap cannot attach a previous user after account switching',()=>{const b=bridge(),a=session(),next=session('user_B','sess_B');b.setClerkSession(a);b.setClerkSession(next);assert.throws(()=>b.bindClerkAccount('account_A',a));assert.throws(()=>b.assertClerkAccount());b.bindClerkAccount('account_B',next);assert.equal(b.assertClerkAccount('account_B').account.id,'account_B');});
test('sign-out immediately invalidates a previously bound account',()=>{const b=bridge(),a=session();b.setClerkSession(a);b.bindClerkAccount('account_A',a);b.setClerkSession(null);assert.throws(()=>b.assertClerkAccount('account_A'));assert.throws(()=>b.bindClerkAccount('account_A',a));});
test('a new session for the same user must establish its own authorization binding',()=>{const b=bridge(),a=session();b.setClerkSession(a);b.bindClerkAccount('account_A',a);b.setClerkSession(session('user_A','sess_New'));assert.throws(()=>b.assertClerkAccount('account_A'));});
