const BASIS='owner_accepted_ai_editorial_review';
function approvalIssues(questions,approval,hashQuestion){
 const errors=[];
 if(approval?.basis!==BASIS||approval.schemaVersion!==1||approval.independentHumanReview!==false||approval.officialEndorsement!==false)errors.push('Invalid or misleading owner/editorial approval basis.');
 if(!approval?.owner?.id||!approval.owner.recordId||!Number.isFinite(Date.parse(approval.owner.approvedAt))||Date.parse(approval.owner.approvedAt)>Date.now()+300000)errors.push('Missing owner acceptance record.');
 if(!approval?.editorial?.reviewerId||!['bankSha256','reportSha256'].every(key=>/^[a-f0-9]{64}$/.test(approval?.editorial?.[key]||'')))errors.push('Missing exact editorial review reference.');
 if(approval?.rights?.basis!=='original_factual_text_no_copied_media'||approval.rights.ownerAccepted!==true||approval.rights.thirdPartyMediaIncluded!==false||approval.rights.sourceLicenceAssumed!==false)errors.push('Originality/rights basis is not recorded.');
 const rows=Array.isArray(approval?.records)?approval.records:[],validRows=rows.filter(r=>r&&typeof r==='object'&&typeof r.questionId==='string'),records=new Map(validRows.map(r=>[r.questionId,r]));
 if(records.size!==rows.length||rows.length!==questions.length)errors.push('Approval must cover exactly these question revisions.');
 for(const q of questions){if(!q||typeof q!=='object'){errors.push('Malformed approved question.');continue;}const r=records.get(q.id);
  if(!r||r.revisionId!==q.revision_id||!/^([a-f0-9]{64})$/.test(r.sha256||'')||r.decision!=='approved_on_recorded_editorial_basis'||hashQuestion&&r.sha256!==hashQuestion(q))errors.push('Missing or stale exact-revision owner/editorial approval.');
 }
 return [...new Set(errors)];
}
module.exports={BASIS,approvalIssues};
