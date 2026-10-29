import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateQuestionPayload} from '../src/domain/content.mjs';
const require=createRequire(import.meta.url);
const {approvalIssues}=require('../src/domain/contentApproval.cjs');
const {contentIssues}=require('../scripts/release-policy.cjs');
const root=fileURLToPath(new URL('..',import.meta.url));
const bank=JSON.parse(readFileSync(new URL('../content/release/ontario-g1.approved.json',import.meta.url)));
const hash=q=>createHash('sha256').update(JSON.stringify(q)).digest('hex');
test('all 500 exact revisions have actual owner acceptance without claiming independent review',()=>{
 assert.deepEqual(contentIssues(bank,root),[]);
 assert.equal(bank.approval.records.length,500);
 assert.equal(bank.approval.independentHumanReview,false);
 assert.equal(bank.exam_template.official_format_verified,false);
});
test('answer changes invalidate exact-revision approval',()=>{
 const changed=structuredClone(bank);changed.questions[0].correct_option_id=changed.questions[0].options.find(o=>o.id!==changed.questions[0].correct_option_id).id;
 assert.match(contentIssues(changed,root).join('\n'),/stale exact-revision/);
});
test('re-hashing an altered answer cannot reuse the owner receipt for the original review',()=>{
 const changed=structuredClone(bank);changed.questions[0].explanation+=' Changed after acceptance.';
 changed.approval.records[0].sha256=hash(changed.questions[0]);
 assert.match(contentIssues(changed,root).join('\n'),/exact editorial decisions/);
});
test('fake independent endorsement and missing or duplicate records are rejected',()=>{
 for(const modify of [a=>a.independentHumanReview=true,a=>a.officialEndorsement=true,a=>a.records.pop(),a=>a.records[1]=a.records[0],a=>a.records[0]=null]){
  const approval=structuredClone(bank.approval);modify(approval);
  assert.ok(approvalIssues(bank.questions,approval,hash).length);
 }
 assert.ok(approvalIssues([null],{...bank.approval,records:[null]},hash).length);
});
test('client samples and full private pack retain only the matching approval records',()=>{
 for(const relative of ['../src/data/generated-bank.json','../supabase/functions/_shared/free-questions.json']){
  const payload=JSON.parse(readFileSync(new URL(relative,import.meta.url)));
  assert.equal(payload.approval.records.length,payload.questions.length);
  assert.deepEqual(approvalIssues(payload.questions,payload.approval,hash),[]);
  assert.deepEqual(validateQuestionPayload(payload),[]);
 }
 assert.deepEqual(validateQuestionPayload({packKey:'CA-ON-G1',version:bank.version,approved:true,questions:bank.questions,approval:bank.approval}),[]);
});
