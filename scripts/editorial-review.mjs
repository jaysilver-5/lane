import { createHash } from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const normalized=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');

// Integrity and ambiguity checks complement the recorded editorial work.
// Passing them never creates independent/rights approval or a release.
export function editorialIssues(raw,report){
 const bank=JSON.parse(raw),issues=[],sources=new Map(bank.sources.map(s=>[s.id,s.url])),concepts=new Map(bank.concepts.map(c=>[c.id,c])),prompts=new Set();
 for(const c of bank.concepts)if(c.source_ids.some(id=>!sources.has(id)))issues.push(`${c.id}: unregistered concept source.`);
 for(const q of bank.questions){
  const prompt=normalized(q.prompt);
  if(!prompt||prompts.has(prompt))issues.push(`${q.code}: empty or duplicate prompt.`);
  prompts.add(prompt);
  if(new Set(q.options.map(o=>normalized(o.text))).size!==4)issues.push(`${q.code}: duplicate answer text.`);
  if(!q.explanation?.trim())issues.push(`${q.code}: missing explanation.`);
  if(!concepts.has(q.concept_id)||concepts.get(q.concept_id).section!==q.section)issues.push(`${q.code}: invalid concept mapping.`);
  for(const e of q.evidence)if(!sources.has(e.source_id)||sources.get(e.source_id)!==e.source_url)issues.push(`${q.code}: evidence does not match its registered source.`);
 }
 if(!report)return issues;
 if(report.schema_version!==1||report.reviewer_type!=='ai'||!report.reviewer_id||report.publication_requested!==false||report.independent_review_completed!==false||report.rights_clearance_completed!==false)issues.push('AI editorial scope must remain explicit and must not impersonate release sign-off.');
 if(report.bank_sha256!==hash(raw))issues.push('AI editorial report is stale for this bank.');
 if(report.question_count!==bank.questions.length||report.concept_count!==new Set(bank.questions.map(q=>q.concept_id)).size)issues.push('AI editorial report has incorrect coverage counts.');
 const records=new Map();
 for(const r of report.questions??[]){if(records.has(r.question_id))issues.push('Duplicate AI editorial record.');records.set(r.question_id,r);}
 if(records.size!==bank.questions.length)issues.push('AI editorial report must account for every question.');
 for(const q of bank.questions){const r=records.get(q.id);
  if(!r||r.code!==q.code||r.revision_id!==q.revision_id||r.sha256!==hash(JSON.stringify(q)))issues.push(`${q.code}: missing or stale exact-revision editorial record.`);
  else if(r.decision!=='source_supported_after_ai_editorial_review'||JSON.stringify(r.source_ids)!==JSON.stringify(q.evidence.map(e=>e.source_id))||!['prompt','all_answer_choices','keyed_answer','explanation','source_support'].every(key=>r.checked?.includes(key)))issues.push(`${q.code}: incomplete editorial decision.`);
 }
 const sourceChecks=new Map((report.source_checks??[]).map(s=>[s.source_id,s]));
 for(const [id,url]of sources)if(sourceChecks.get(id)?.url!==url)issues.push(`${id}: missing or stale source review record.`);
 return [...new Set(issues)];
}
