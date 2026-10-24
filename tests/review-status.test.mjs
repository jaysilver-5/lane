import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { reviewStatus } from '../scripts/review-status.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const original = JSON.parse(readFileSync(new URL('../content/ontario-g1.draft.json', import.meta.url), 'utf8'));
const bank = { ...original, questions: original.questions.slice(0, 3) }, raw = JSON.stringify(bank);
const decision = (index = 0, overrides = {}) => {
  const q = bank.questions[index];
  return { question_id: q.id, code: q.code, revision_id: q.revision_id, sha256: hash(JSON.stringify(q)),
    factual: 'approved', rights: 'approved', notes: 'Synthetic fixture only.', reviewer: 'Synthetic independent reviewer', reviewed_at: '2026-10-20T12:00:00Z', ...overrides };
};
const file = decisions => ({ name: 'synthetic-export.json', value: { schema_version: 1, pack_key: 'CA-ON-G1', bank_sha256: hash(raw), decisions } });

test('an empty real-world export reports pending reviews without generating approvals', () => {
  const before = JSON.stringify(bank), report = reviewStatus(raw, [file([])]);
  assert.deepEqual(report.counts, { approved: 0, needs_changes: 0, pending: 3 });
  assert.equal(report.publicationRequested, false); assert.equal(report.readyForReleaseAssembly, false);
  assert.equal(report.releaseWide.publicReleaseApproved, false); assert.equal(JSON.stringify(bank), before);
});

test('reviews for another draft or stale question hash never count as approval', () => {
  const wrong = file([decision()]); wrong.value.bank_sha256 = '0'.repeat(64);
  assert.equal(reviewStatus(raw, [wrong]).counts.approved, 0);
  for (const overrides of [{ sha256: '0'.repeat(64) }, { question_id: 'different' }, { revision_id: 'unknown' }]) {
    const report = reviewStatus(raw, [file([decision(0, overrides)])]);
    assert.equal(report.counts.approved, 0); assert.equal(report.validationErrors.length, 1);
  }
});

test('self-review, anonymous and future-dated records cannot pass reconciliation', () => {
  for (const overrides of [{ reviewer: ' ' }, { reviewer: bank.questions[0].author_id }, { reviewer: ' '+bank.questions[0].author_id+' ' }, { reviewed_at: '2999-01-01' }]) {
    const report = reviewStatus(raw, [file([decision(0, overrides)])]);
    assert.equal(report.counts.approved, 0); assert.equal(report.validationErrors.length, 1);
  }
});

test('the same reviewer can correct a decision in a later export without double counting', () => {
  const report = reviewStatus(raw, [file([decision()]), file([decision(0, { factual: 'needs_changes', reviewed_at: '2026-10-21T12:00:00Z' }), decision(1)])]);
  assert.deepEqual(report.counts, { approved: 1, needs_changes: 1, pending: 1 }); assert.deepEqual(report.validationErrors, []);
});

test('conflicting reviewers or same-time edits are reported rather than silently merged', () => {
  for (const overrides of [{ reviewer: 'Another synthetic reviewer' }, { factual: 'needs_changes' }]) {
    const report = reviewStatus(raw, [file([decision()]), file([decision(0, overrides)])]);
    assert.equal(report.validationErrors.length, 1); assert.equal(report.readyForReleaseAssembly, false);
  }
});
