import { allowedQuestions, canReadQuestion, canUseFeature } from './access.mjs';
import { selectQuestions } from './engine.mjs';

/** Resize mixed practice without changing any retained question or answer. */
export function resizedQuickSession(session, bank, count) {
  if (!session || session.mode !== 'quick' || session.finishedAt || ![5, 10, 20, 40, 60].includes(count) || count < Math.max(session.index + 1, session.answers.length)) return null;
  const retained = session.questionIds.slice(0, count);
  const byId = new Map(bank.map(q => [q.id, q]));
  if (retained.some(id => !byId.has(id))) return null;
  const concepts = new Set(retained.map(id => byId.get(id).concept_id));
  const extra = selectQuestions(bank.filter(q => !concepts.has(q.concept_id)), { mode: 'topic', count: Math.max(0, count - retained.length) });
  const questionIds = [...retained, ...extra.map(q => q.id)];
  return questionIds.length === count ? { ...session, questionIds, continuous: false, title: 'Daily practice' } : null;
}

/** Refill continuous mixed practice only from the caller's authorized live pool. */
export function continuedQuickSession(session, bank) {
  if (!session?.continuous || session.mode !== 'quick' || session.finishedAt || session.answers.length <= session.index) return null;
  if (session.index < session.questionIds.length - 1) return { ...session, index: session.index + 1 };
  const pool = bank.filter(q => q.pack_key === 'CA-ON-G1');
  if (!pool.length) return null;
  const start = Math.floor((session.questionIds.length - 1) / pool.length) * pool.length;
  const seen = new Set(session.questionIds.slice(start));
  let candidates = pool.filter(q => !seen.has(q.id));
  if (!candidates.length) candidates = pool.filter(q => q.id !== session.questionIds[session.index]);
  const next = selectQuestions(candidates.length ? candidates : pool, { mode: 'topic', count: 1 })[0];
  return next ? { ...session, questionIds: [...session.questionIds, next.id], index: session.index + 1 } : null;
}

/** Stopping practice records only answered questions, with an honest denominator. */
export function finishedPracticeSession(session, now = new Date().toISOString()) {
  if (!session || session.mode === 'mock' || session.finishedAt || !session.answers.length) return null;
  return { ...session, questionIds: session.questionIds.slice(0, session.answers.length), index: session.answers.length - 1, finishedAt: now };
}

/** The same access-filtered pool drives both the promise and the practice session. */
export function topicAvailability(topic, bank, access, manifest) {
  const pool = bank.filter(q => q.topic === topic.title);
  const available = allowedQuestions(pool, access, manifest);
  const totalCount = Math.max(Number(topic.count) || 0, pool.length);
  const availableCount = available.length;
  const locked = !access.full && availableCount === 0;
  const needsDownload = access.full && availableCount < totalCount;
  const sampleWord = access.kind === 'guest' ? 'guest' : 'free';
  const label = access.full
    ? needsDownload ? `${availableCount} available · ${totalCount} in Complete` : `${availableCount} questions`
    : locked ? `${totalCount} in Complete · no ${sampleWord} samples`
      : `${availableCount} ${sampleWord} ${availableCount === 1 ? 'sample' : 'samples'} · ${totalCount} in Complete`;
  return { available, availableCount, totalCount, locked, needsDownload, label,
    objectives: [...new Set(available.map(q => q.learning_objective))] };
}

/** A generic upgrade prompt must never turn an ordinary free session into paid state. */
export function sessionRequiresUpgrade(session, access, manifest) {
  if (!session || access.full) return false;
  return !canUseFeature(session.mode, access) || (session.continuous === true && !canUseFeature('continuous', access)) ||
    session.questionIds.some(id => !canReadQuestion(id, access, manifest));
}
export function parkIncompatibleSession(state, access, manifest) {
  if (!sessionRequiresUpgrade(state.active, access, manifest)) return state;
  return { ...state, pausedPremium: state.active, active: null };
}
/** Recover a free session parked by versions before this fix, without losing a current one. */
export function recoverCompatibleSession(state, access, manifest) {
  if (access.full || state.active || !state.pausedPremium ||
      sessionRequiresUpgrade(state.pausedPremium, access, manifest)) return state;
  return { ...state, active: state.pausedPremium, pausedPremium: null };
}
export function freePlanLabel(access) {
  return access.kind === 'guest' ? 'Available after free signup' :
    access.kind === 'free' ? 'Your plan' : 'Always available';
}
