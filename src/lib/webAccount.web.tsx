import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ClerkProvider, useClerk, useSession, useUser } from '@clerk/react';
import { config } from '../config';
import type { Identity } from './demoAccount';
import type { WebAccountState } from './webAccount';
import { bindClerkAccount, currentClerkSession, setClerkSession } from './clerkSession';
import { bootstrapClerkAccount, humanError } from './supabase';
export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
export const clerkConfigured = /^pk_(test|live)_/.test(clerkPublishableKey);
const empty: WebAccountState = { enabled: true, ready: true, identity: null, error: '', refresh: async () => {}, signOut: async () => {} };
const Context = createContext<WebAccountState>(empty);
export function useWebAccount() { return useContext(Context); }
function AccountBridge({ children }: { children: React.ReactNode }) {
  const { session, isLoaded } = useSession(), { user } = useUser(), clerk = useClerk();
  const [state, setState] = useState<{ key: string; identity: Identity | null; error: string }>({ key: '', identity: null, error: '' });
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => { const timer=setTimeout(()=>setLoadTimedOut(true),10000); return()=>clearTimeout(timer); }, []);
  const activeSession = session?.status === 'active' && !session.currentTask ? session : null;
  const request = useRef(0), key = activeSession ? `${activeSession.user.id}:${activeSession.id}` : '';
  setClerkSession(activeSession ? { subject: activeSession.user.id, sessionId: activeSession.id, getToken: () => activeSession.getToken() } : null);
  const refresh = useCallback(async () => {
    const seq = ++request.current, expected = currentClerkSession();
    if (!expected) { setState({ key: '', identity: null, error: '' }); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const identity = await Promise.race([
        bootstrapClerkAccount(expected),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Your account connection timed out. Check your connection and try again.')), 15000); }),
      ]);
      if (seq !== request.current) return;
      bindClerkAccount(identity.id, expected);
      setState({ key: `${expected.subject}:${expected.sessionId}`, identity, error: '' });
    } catch (error) {
      if (seq === request.current) setState({ key: `${expected.subject}:${expected.sessionId}`, identity: null, error: humanError(error) });
      throw error;
    } finally { if (timer) clearTimeout(timer); }
  }, [key, user?.primaryEmailAddress?.verification.status]);
  useEffect(() => {
    if (!isLoaded) return;
    void refresh().catch(() => {});
    const update = () => { if (document.visibilityState === 'visible') void refresh().catch(() => {}); };
    const timer = setInterval(update, 45000);
    window.addEventListener('focus', update); window.addEventListener('online', update);
    return () => { request.current++; clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('online', update); };
  }, [isLoaded, refresh]);
  const signOut = useCallback(async () => { await clerk.signOut(); setClerkSession(null); setState({ key: '', identity: null, error: '' }); }, [clerk]);
  // Clerk loading is only the first step. Do not expose a transient guest owner
  // while the active session is still connecting to its canonical account.
  const ready = isLoaded ? !activeSession || state.key === key : loadTimedOut;
  return <Context.Provider value={{ enabled: true, ready, identity: isLoaded && state.key === key ? state.identity : null, error: state.key === key ? state.error : '', refresh, signOut }}>{children}</Context.Provider>;
}
export function WebAccountProvider({ children }: { children: React.ReactNode }) {
  if (config.mode === 'demo' || !clerkConfigured) return <Context.Provider value={empty}>{children}</Context.Provider>;
  return <ClerkProvider publishableKey={clerkPublishableKey} signInUrl="/auth/sign-in" signUpUrl="/auth/sign-up" signInFallbackRedirectUrl="/auth/callback" signUpFallbackRedirectUrl="/auth/callback"><AccountBridge>{children}</AccountBridge></ClerkProvider>;
}
