import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const {webReleaseIssues,webConfigurationIssues,webAuthenticationIssues}=createRequire(import.meta.url)('../scripts/web-release-policy.cjs');
const root=fileURLToPath(new URL('..',import.meta.url));
function pendingAcceptanceRoot(t){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'firstlane-web-acceptance-'));
 for(const file of ['content/release/ontario-g1.approved.json','content/ontario-g1.draft.json','content/approvals/owner-2026-10-24.json','content/review/ai-editorial-2026-10-24.json','content/sample-manifest.json','web-launch-scope.json']){
  const target=path.join(folder,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);
 }
 fs.writeFileSync(path.join(folder,'web-release-approvals.json'),JSON.stringify({authEmailAndRecoveryPassed:false}));
 t.after(()=>{
  assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(folder).startsWith('firstlane-web-acceptance-'));
  fs.rmSync(folder,{recursive:true,force:true});
 });
 return folder;
}
test('owner-approved content clears content gating while missing services and acceptance still block launch',t=>{
 const issues=webReleaseIssues(pendingAcceptanceRoot(t),{});
 assert.ok(issues.some(x=>x.includes('SUPABASE_URL')));
 assert.ok(issues.some(x=>x.includes('Paddle live')));
 assert.equal(issues.some(x=>x.includes('release content')),false);
 assert.ok(issues.some(x=>x.includes('authEmailAndRecoveryPassed')));
});
test('acceptance candidate retains configuration/content checks while customer checks remain in public gate',t=>{
 const fixture=pendingAcceptanceRoot(t);
 const issues=webConfigurationIssues(fixture,{}).join('\n');
 assert.match(issues,/SUPABASE_URL/);assert.match(issues,/Paddle live/);
 assert.doesNotMatch(issues,/authEmailAndRecoveryPassed/);
 assert.match(webReleaseIssues(fixture,{}).join('\n'),/authEmailAndRecoveryPassed/);
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
  save(['email_code','email_password']);assert.match(webAuthenticationIssues(folder,{}).join('\n'),/authEmailCodePassed/);
  assert.deepEqual(webAuthenticationIssues(folder,{authEmailCodePassed:true}),[]);
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
