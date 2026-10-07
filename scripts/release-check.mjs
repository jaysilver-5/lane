import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {releaseIssues}=createRequire(import.meta.url)('./release-policy.cjs');
const root=fileURLToPath(new URL('..',import.meta.url));
const {loadEnvironment}=await import('./load-environment.mjs');loadEnvironment(root);
const issues=releaseIssues(root,process.env);
if(issues.length){console.error('RELEASE BLOCKED\n'+issues.map(x=>' - '+x).join('\n'));process.exitCode=2;}
else console.log('Release configuration/content/acceptance checks passed. Store review is still controlled by Apple and Google.');
