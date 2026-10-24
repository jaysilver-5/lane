import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editorialIssues} from '../scripts/editorial-review.mjs';
const raw=readFileSync(new URL('../content/ontario-g1.draft.json',import.meta.url),'utf8');
const report=JSON.parse(readFileSync(new URL('../content/review/ai-editorial-2026-10-24.json',import.meta.url),'utf8'));
test('the actual 500-question editorial report is exact and does not promote the draft',()=>{
 assert.deepEqual(editorialIssues(raw,report),[]);
 const bank=JSON.parse(raw);assert.equal(bank.questions.length,500);
 assert.equal(bank.usage.public_release_allowed,false);
 assert.ok(bank.questions.every(q=>q.review.publishable===false&&q.review.independent_review.status==='pending'&&q.review.rights_review.status==='pending'));
});
test('changed keyed answers, missing rows and source replacements invalidate recorded review',()=>{
 const bank=JSON.parse(raw);bank.questions[0].correct_option_id=bank.questions[0].options.find(o=>o.id!==bank.questions[0].correct_option_id).id;
 assert.ok(editorialIssues(JSON.stringify(bank),report).some(x=>x.includes('exact-revision')));
 const missing=structuredClone(report);missing.questions.pop();assert.ok(editorialIssues(raw,missing).some(x=>x.includes('every question')));
 const source=structuredClone(report);source.source_checks[0].url='https://example.com/';assert.ok(editorialIssues(raw,source).some(x=>x.includes('source review')));
});
test('duplicate choices and mismatched citations are editorial errors even with valid answer IDs',()=>{
 const bank=JSON.parse(raw),q=bank.questions[0];q.options[0].text=q.options[1].text.toUpperCase();q.evidence[0].source_url='https://example.com/';bank.concepts[0].source_ids=['retired-source'];
 const issues=editorialIssues(JSON.stringify(bank));assert.ok(issues.some(x=>x.includes('duplicate answer text')));assert.ok(issues.some(x=>x.includes('registered source')));assert.ok(issues.some(x=>x.includes('unregistered concept source')));
});
test('AI records cannot be represented as independent or rights release approval',()=>{
 for(const field of['publication_requested','independent_review_completed','rights_clearance_completed']){const copy=structuredClone(report);copy[field]=true;assert.ok(editorialIssues(raw,copy).some(x=>x.includes('impersonate')));}
});
