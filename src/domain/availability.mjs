import { allowedQuestions, canReadQuestion, canUseFeature } from './access.mjs';

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
    ? needsDownload ? `${availableCount} loaded · ${totalCount} in your pack` : `${availableCount} questions`
    : locked ? `${totalCount} in Complete · no ${sampleWord} samples`
      : `${availableCount} ${sampleWord} ${availableCount === 1 ? 'sample' : 'samples'} · ${totalCount} in Complete`;
  return { available, availableCount, totalCount, locked, needsDownload, label,
    objectives: [...new Set(available.map(q => q.learning_objective))] };
}

/** A generic upgrade prompt must never turn an ordinary free session into paid state. */
export function sessionRequiresUpgrade(session, access, manifest) {
  if (!session || access.full) return false;
  return !canUseFeature(session.mode, access) ||
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
