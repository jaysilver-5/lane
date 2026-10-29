import {readFile} from 'node:fs/promises';import {validateBank} from '../src/domain/engine.mjs';
import {editorialIssues} from './editorial-review.mjs';
import {createRequire} from 'node:module';import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';
const raw=await readFile(new URL('../content/ontario-g1.draft.json',import.meta.url),'utf8'),bank=JSON.parse(raw);
let editorial;
if(bank.provenance?.ai_editorial_review){
 const report=bank.provenance.ai_editorial_review.report;
 if(!/^content\/review\/ai-editorial-\d{4}-\d{2}-\d{2}\.json$/.test(report))throw Error('Invalid editorial report location.');
 editorial=JSON.parse(await readFile(new URL('../'+report,import.meta.url),'utf8'));
}
const errors=[...validateBank(bank),...editorialIssues(raw,editorial)];if(bank.questions.length!==500)errors.push('Expected 500 internal review questions.');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
let ownerApproved=0;
if(existsSync(new URL('../content/release/ontario-g1.approved.json',import.meta.url))){const {readApproved,contentIssues}=createRequire(import.meta.url)('./release-policy.cjs'),root=fileURLToPath(new URL('..',import.meta.url)),release=readApproved(root),issues=contentIssues(release,root);if(issues.length)throw Error(issues.join('\n'));if(release.approval?.basis==='owner_accepted_ai_editorial_review')ownerApproved=release.questions.length;}
console.log(JSON.stringify({questions:bank.questions.length,concepts:new Set(bank.questions.map(q=>q.concept_id)).size,roadSigns:bank.questions.filter(q=>q.section==='road_signs').length,roadRules:bank.questions.filter(q=>q.section==='road_rules').length,sourceRecords:bank.sources.length,aiEditorialReviewed:editorial?.questions.length??0,independentlyApproved:bank.questions.filter(q=>q.review?.independent_review?.status==='approved').length,ownerApproved,status:ownerApproved===500?'CONTENT APPROVAL PASS — owner accepted the exact AI editorial review; no independent human certification claimed':'STRUCTURE AND EDITORIAL-INTEGRITY PASS — publication approval is pending'},null,2));
