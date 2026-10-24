import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const productionEnv={...process.env,EXPO_PUBLIC_APP_MODE:'production',EXPO_PUBLIC_RELEASE_TARGET:'web',EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_live_test_fixture',EXPO_PUBLIC_SUPABASE_URL:'https://test.supabase.co',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_fixture',EXPO_PUBLIC_PADDLE_ENVIRONMENT:'live',EXPO_PUBLIC_PADDLE_CLIENT_TOKEN:'live_test_fixture',EXPO_PUBLIC_WEB_APP_URL:'https://www.getfirstlane.com/app',EXPO_PUBLIC_WEB_BASE_PATH:'/app',EXPO_PUBLIC_SUPPORT_EMAIL:'support@getfirstlane.com',EXPO_PUBLIC_OPERATOR_NAME:'FirstLane test fixture',EXPO_PUBLIC_PRIVACY_URL:'https://www.getfirstlane.com/privacy',EXPO_PUBLIC_TERMS_URL:'https://www.getfirstlane.com/terms',EXPO_PUBLIC_ACCOUNT_DELETION_URL:'https://www.getfirstlane.com/delete-account',EAS_BUILD_PROFILE:'',EAS_BUILD_PLATFORM:'',FIRSTLANE_WEB_DEPLOYMENT_STAGE:''};
const config=env=>spawnSync(process.execPath,['-e',"require('@expo/config').getConfig(process.cwd()); console.log('EXPO_CONFIG_LOADED')"],{cwd:root,env:{...productionEnv,...env},encoding:'utf8',timeout:20000});
test('actual Expo production config loads for an explicit protected acceptance candidate',()=>{
 const result=config({FIRSTLANE_WEB_DEPLOYMENT_STAGE:'acceptance'});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/EXPO_CONFIG_LOADED/);
});
test('actual Expo public config still rejects unfinished customer acceptance',()=>{
 const result=config({});assert.notEqual(result.status,0);assert.match(result.stderr,/authEmailAndRecoveryPassed/);
});
test('acceptance stage never bypasses native store configuration or missing live services',()=>{
 for(const env of [{EAS_BUILD_PROFILE:'production'},{EAS_BUILD_PLATFORM:'ios'},{EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_fixture'}]){
  const result=config({FIRSTLANE_WEB_DEPLOYMENT_STAGE:'acceptance',...env});assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/EXPO_CONFIG_LOADED/);
 }
});
