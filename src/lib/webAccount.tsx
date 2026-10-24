import type { Identity } from './demoAccount';
export interface WebAccountState {
  enabled: boolean; ready: boolean; identity: Identity | null; error: string;
  refresh: () => Promise<void>; signOut: () => Promise<void>;
}
// Native authentication is outside the current web implementation.
export function useWebAccount(): WebAccountState {
  return { enabled: false, ready: true, identity: null, error: '', refresh: async () => {}, signOut: async () => {} };
}
export function WebAccountProvider({ children }: { children: React.ReactNode }) { return children; }
