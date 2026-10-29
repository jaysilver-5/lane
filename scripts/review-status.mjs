import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const approved = decision => decision?.factual === 'approved' && decision?.rights === 'approved';

/** Reconcile real review exports against exact current revisions. Never publishes. */
export function reviewStatus(raw, exports = []) {
  const bank = JSON.parse(raw), bankHash = sha(raw), revisions = new Map(bank.questions.map(q => [q.revision_id, q]));
  const decisions = new Map(), errors = [];
  for (const { name, value } of exports) {
    if (value.schema_version !== 1 || value.pack_key !== 'CA-ON-G1' || value.bank_sha256 !== bankHash || !Array.isArray(value.decisions)) {
      errors.push(`${name}: incompatible export or different draft hash.`); continue;
    }
    for (const decision of value.decisions) {
      const question = revisions.get(decision.revision_id);
      const valid = question && decision.question_id === question.id && decision.sha256 === sha(JSON.stringify(question)) &&
        typeof decision.reviewer === 'string' && decision.reviewer.trim() && decision.reviewer.trim() !== question.author_id &&
        Number.isFinite(Date.parse(decision.reviewed_at)) && Date.parse(decision.reviewed_at) <= Date.now() + 300000 &&
        ['pending', 'approved', 'needs_changes'].includes(decision.factual) && ['pending', 'approved', 'needs_changes'].includes(decision.rights);
      if (!valid) { errors.push(`${name}: invalid or stale review for ${decision.code || decision.revision_id || 'unknown question'}.`); continue; }
      const previous = decisions.get(decision.revision_id);
      if (previous && previous.reviewer !== decision.reviewer && JSON.stringify(previous) !== JSON.stringify(decision)) {
        errors.push(`${name}: conflicting reviewers for ${question.code}; reconcile explicitly.`); continue;
      }
      if (!previous || Date.parse(decision.reviewed_at) > Date.parse(previous.reviewed_at)) decisions.set(decision.revision_id, decision);
      else if (Date.parse(decision.reviewed_at) === Date.parse(previous.reviewed_at) && JSON.stringify(previous) !== JSON.stringify(decision)) {
        errors.push(`${name}: conflicting decisions at the same timestamp for ${question.code}.`);
      }
    }
  }
  const rows = bank.questions.map(q => {
    const decision = decisions.get(q.revision_id);
    return { code: q.code, revisionId: q.revision_id, status: approved(decision) ? 'approved' :
      decision?.factual === 'needs_changes' || decision?.rights === 'needs_changes' ? 'needs_changes' : 'pending' };
  });
  const counts = Object.fromEntries(['approved', 'needs_changes', 'pending'].map(status => [status, rows.filter(row => row.status === status).length]));
  return {
    schemaVersion: 1, bankSha256: bankHash, packKey: bank.pack_key || 'CA-ON-G1', publicationRequested: false,
    questionCount: rows.length, conceptCount: new Set(bank.questions.map(q => q.concept_id)).size,
    textOnlySignQuestions: bank.questions.filter(q => q.section === 'road_signs' && q.media?.presentation === 'text_description').length,
    counts, exportCount: exports.length, validationErrors: errors,
    releaseWide: {
      independentReviewCompleted: bank.provenance?.independent_review_completed === true || bank.provenance?.independent_ontario_reviewer_completed === true,
      rightsClearanceCompleted: bank.provenance?.rights_clearance_completed === true,
      rehearsalTemplateApproved: bank.exam_template?.enabled_for_public_use === true,
      publicReleaseApproved: bank.usage?.public_release_allowed === true,
    },
    knownCoverageGaps: bank.coverage?.known_gaps || [], rows,
    readyForReleaseAssembly: errors.length === 0 && rows.length === 500 && counts.approved === 500,
    note: 'Exact-revision decision reconciliation only. Factual correctness, rights, coverage and release-wide acceptance require actual review; no release file or approval is generated.',
  };
}
