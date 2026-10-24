import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const {webReleaseIssues}=createRequire(import.meta.url)('../scripts/web-release-policy.cjs');
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
