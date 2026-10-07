/** Validate downloads before any in-memory replacement or persistent install. */
/** @param {any} payload @param {{approved?:boolean, expectedCount?:number, expectedVersion?:string}} options */
export function validateQuestionPayload(payload, { approved = true, expectedCount, expectedVersion } = {}) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || payload.packKey !== 'CA-ON-G1') return ['Wrong or missing pack.'];
  if (typeof payload.version !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(payload.version)) errors.push('Invalid version.');
  if (expectedVersion && payload.version !== expectedVersion) errors.push('Release version mismatch.');
  if (approved && payload.approved !== true) errors.push('Content has not been approved.');
  if (!Array.isArray(payload.questions) || !payload.questions.length || payload.questions.length > 5000) return [...errors, 'Invalid question list.'];
  if (expectedCount !== undefined && payload.questions.length !== expectedCount) errors.push('Question count mismatch.');
  const ids = new Set(), revisions = new Set();
  for (const q of payload.questions) {
    if (!q || typeof q !== 'object') { errors.push('Invalid question.'); continue; }
    if (typeof q.id !== 'string' || ids.has(q.id) || typeof q.revision_id !== 'string' || revisions.has(q.revision_id)) errors.push('Duplicate or invalid question/revision ID.');
    ids.add(q.id); revisions.add(q.revision_id);
    for (const key of ['code','concept_id','topic','learning_objective','prompt','explanation']) if (typeof q[key] !== 'string' || !q[key].trim() || q[key].length > 10000) errors.push(`Invalid ${key}.`);
    if (!Number.isInteger(q.revision) || q.revision < 1) errors.push('Invalid revision number.');
    if (q.pack_key !== 'CA-ON-G1' || !['road_signs','road_rules'].includes(q.section)) errors.push('Wrong jurisdiction or section.');
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map(o => o?.id)).size !== 4 || q.options.some(o => !o || typeof o.id !== 'string' || typeof o.text !== 'string' || !o.text.trim()) || !q.options.some(o => o.id === q.correct_option_id)) errors.push('Invalid answer options.');
    if (!Array.isArray(q.evidence) || !q.evidence.length || q.evidence.some(e => !e || typeof e.source_url !== 'string' || !/^https:\/\//.test(e.source_url))) errors.push('Missing safe reference.');
    if (approved && (q.review?.publishable !== true || q.review?.publication_status !== 'approved' || q.review?.independent_review?.status !== 'approved' || q.review?.rights_review?.status !== 'approved')) errors.push('Unapproved question revision.');
    // The current renderer is text-only. Never silently omit required learning media.
    if (q.media?.required || q.media?.visual_recognition_assessed) errors.push('Required learning media is not supported by this release renderer.');
  }
  return [...new Set(errors)];
}
export function mergeSampleBank(samples, complete) {
  const map = new Map(samples.map(q => [q.id, q]));
  for (const q of complete) map.set(q.id, q);
  return [...map.values()];
}
