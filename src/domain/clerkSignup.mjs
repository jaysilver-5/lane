/** Choose a continuation from the latest Clerk render, never an async handler's old snapshot. */
export function clerkSignupStep(signUp, session) {
  if (session?.currentTask || session?.status === 'pending') return 'security';
  if (session?.status === 'active') return 'connect';
  if (signUp.status === 'complete') return 'finalize';
  if (signUp.status === 'abandoned' || !signUp.id) return 'restart';
  if (signUp.missingFields?.length) return 'details';
  if (signUp.unverifiedFields?.includes('email_address')) return 'verify-email';
  return 'pending';
}
