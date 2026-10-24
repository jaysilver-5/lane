export interface ClerkSnapshot {
  subject: string;
  sessionId: string;
  getToken: () => Promise<string | null>;
}
let snapshot: ClerkSnapshot | null = null;
let account: { id: string; subject: string; sessionId: string } | null = null;
export function setClerkSession(next: ClerkSnapshot | null) {
  if (next?.subject !== snapshot?.subject || next?.sessionId !== snapshot?.sessionId) account = null;
  snapshot = next;
}
export function currentClerkSession() { return snapshot; }
export function bindClerkAccount(id: string, expected: ClerkSnapshot) {
  if (snapshot?.subject !== expected.subject || snapshot?.sessionId !== expected.sessionId) throw new Error('Your account changed. Please try again.');
  account = { id, subject: expected.subject, sessionId: expected.sessionId };
}
export function assertClerkAccount(id?: string) {
  if (!snapshot || !account || account.subject !== snapshot.subject || account.sessionId !== snapshot.sessionId || (id && id !== account.id)) throw new Error('Your account changed. Please sign in again.');
  return { snapshot, account };
}
