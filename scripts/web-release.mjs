import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const root=fileURLToPath(new URL('..',import.meta.url));
const localEnv=new URL('../.env.local',import.meta.url);
if(existsSync(localEnv))process.loadEnvFile?.(localEnv);
const {webReleaseIssues,webConfigurationIssues}=createRequire(import.meta.url)('./web-release-policy.cjs');
const acceptance=process.argv.includes('--acceptance');
const issues=(acceptance?webConfigurationIssues:webReleaseIssues)(root,process.env);
if(acceptance&&process.env.FIRSTLANE_WEB_DEPLOYMENT_STAGE!=='acceptance')issues.push('Explicit FIRSTLANE_WEB_DEPLOYMENT_STAGE=acceptance is required.');
if(issues.length){console.error('Web public launch blocked:\n'+issues.join('\n')+'\n\nThe public-release checklist stopped this deployment before compilation. See docs/LAUNCH_STATUS.md. Protected connected previews build separately; they do not satisfy release acceptance.');process.exit(1);}
if(acceptance)console.log('Building a production acceptance candidate. Keep Vercel deployment authentication enabled. Customer/payment acceptance remains pending; this is not public-release approval.');
if(process.argv.includes('--check')){console.log(acceptance?'Acceptance configuration passed; public release remains gated.':'Web release configuration passed.');process.exit(0);}
const env={...process.env,EXPO_PUBLIC_APP_MODE:'production',EXPO_PUBLIC_RELEASE_TARGET:'web'};
for(const args of [['scripts/bundle-content.mjs','--web'],['node_modules/expo/bin/cli','export','--platform','web','--clear','--max-workers','1']]){
 const result=spawnSync(process.execPath,args,{cwd:root,env,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
