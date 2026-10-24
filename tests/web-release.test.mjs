import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const {webReleaseIssues,webConfigurationIssues,webAuthenticationIssues}=createRequire(import.meta.url)('../scripts/web-release-policy.cjs');
const root=fileURLToPath(new URL('..',import.meta.url));
test('owner-approved content clears content gating while missing services and acceptance still block launch',()=>{
 const issues=webReleaseIssues(root,{});
 assert.ok(issues.some(x=>x.includes('SUPABASE_URL')));
 assert.ok(issues.some(x=>x.includes('Paddle live')));
 assert.equal(issues.some(x=>x.includes('release content')),false);
 assert.ok(issues.some(x=>x.includes('authEmailAndRecoveryPassed')));
});
test('acceptance candidate retains configuration/content checks while customer checks remain in public gate',()=>{
 const issues=webConfigurationIssues(root,{}).join('\n');
 assert.match(issues,/SUPABASE_URL/);assert.match(issues,/Paddle live/);
 assert.doesNotMatch(issues,/authEmailAndRecoveryPassed/);
 assert.match(webReleaseIssues(root,{}).join('\n'),/authEmailAndRecoveryPassed/);
});
test('web launch does not require unfinished native store setup',()=>{
 const issues=webReleaseIssues(root,{}).join('\n');
 assert.doesNotMatch(issues,/REVENUECAT|BUNDLE_ID|ANDROID_PACKAGE|EAS_PROJECT_ID|iosSandboxPassed|androidSandboxPassed/);
});
test('web launch rejects a privileged Supabase key',()=>{
 assert.ok(webReleaseIssues(root,{EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_do_not_ship'}).some(x=>x.includes('public Supabase')));
});

test('production URL and export mount must match the main-domain migration',()=>{
 for(const url of ['https://app.getfirstlane.com','https://www.getfirstlane.com','https://getfirstlane.com/app']) {
  assert.ok(webReleaseIssues(root,{EXPO_PUBLIC_WEB_APP_URL:url}).some(issue=>issue.includes('production web app URL')));
 }
 const correct={EXPO_PUBLIC_WEB_APP_URL:'https://www.getfirstlane.com/app',EXPO_PUBLIC_WEB_BASE_PATH:'/app'};
 assert.equal(webReleaseIssues(root,correct).some(issue=>issue.includes('production web app URL')||issue.includes('base path')),false);
 assert.ok(webReleaseIssues(root,{...correct,EXPO_PUBLIC_WEB_BASE_PATH:''}).some(issue=>issue.includes('base path')));
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
