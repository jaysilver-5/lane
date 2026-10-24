import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const {webReleaseIssues,webAuthenticationIssues}=createRequire(import.meta.url)('../scripts/web-release-policy.cjs');
const root=fileURLToPath(new URL('..',import.meta.url));
test('web launch blocks missing services, sandbox payments and unreviewed content',()=>{
 const issues=webReleaseIssues(root,{});
 assert.ok(issues.some(x=>x.includes('SUPABASE_URL')));
 assert.ok(issues.some(x=>x.includes('Paddle live')));
 assert.ok(issues.some(x=>x.includes('release content')));
 assert.ok(issues.some(x=>x.includes('authEmailAndRecoveryPassed')));
});
test('web launch does not require unfinished native store setup',()=>{
 const issues=webReleaseIssues(root,{}).join('\n');
 assert.doesNotMatch(issues,/REVENUECAT|BUNDLE_ID|ANDROID_PACKAGE|EAS_PROJECT_ID|iosSandboxPassed|androidSandboxPassed/);
});
test('web launch rejects a privileged Supabase key',()=>{
 assert.ok(webReleaseIssues(root,{EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_do_not_ship'}).some(x=>x.includes('public Supabase')));
});

test('email-only launch needs no social approval; exposing a social provider requires its acceptance',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'firstlane-auth-scope-'));
 try {
  const save=methods=>fs.writeFileSync(path.join(folder,'web-launch-scope.json'),JSON.stringify({authenticationMethods:methods}));
  save(['email_password']);assert.deepEqual(webAuthenticationIssues(folder,{clerkSocialSignInPassed:false}),[]);
  for(const provider of ['oauth_google','oauth_apple']){
   save(['email_password',provider]);assert.match(webAuthenticationIssues(folder,{}).join('\n'),/clerkSocialSignInPassed/);
   assert.deepEqual(webAuthenticationIssues(folder,{clerkSocialSignInPassed:true}),[]);
  }
  save(['unknown']);assert.match(webAuthenticationIssues(folder,{}).join('\n'),/supported web authentication/);
 } finally {
  assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(folder).startsWith('firstlane-auth-scope-'));
  fs.rmSync(folder,{recursive:true,force:true});
 }
});
