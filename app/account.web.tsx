import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from '@clerk/react';
import { useApp } from '../src/state/AppState';
import { clerkConfigured, useWebAccount } from '../src/lib/webAccount.web';
import { currentClerkSession } from '../src/lib/clerkSession';
import { Button, Card, Copy, Field, Heading, Muted, Note, Screen, Sheet } from '../src/components/UI';

export default function Account() {
  const router = useRouter();
  if (!clerkConfigured) return <Screen back title="Your account"><Heading sub="Guest progress stays on this device.">Your FirstLane.</Heading><Button onPress={() => router.push('/auth/sign-up')}>Create a free account</Button><Button kind="secondary" onPress={() => router.push('/auth/sign-in')}>Sign in</Button></Screen>;
  return <ConnectedAccount/>;
}
function ConnectedAccount() {
  const router = useRouter(), { session } = useSession(), account = useWebAccount();
  const { identity, sync, syncStatus, clearAccountData, signOut, resetProgress, reloadAccess } = useApp();
  const [sheet, setSheet] = useState<'delete' | 'reset' | null>(null), [confirmation, setConfirmation] = useState(''), [error, setError] = useState('');
  async function remove() {
    setError('');
    try {
      const expected = currentClerkSession(), token = await expected?.getToken();
      if (!expected || !token) throw new Error('Sign in again before deleting your account.');
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST', headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.deleted !== true) throw new Error(result?.error || 'Deletion could not be confirmed. Please try again.');
      if (currentClerkSession()?.sessionId !== expected.sessionId) throw new Error('The account changed. Sign in again to refresh this device.');
      await clearAccountData();
      await signOut().catch(() => {});
      router.replace('/(tabs)');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Deletion could not be confirmed.'); }
  }
  return <Screen back title="Your account">
    <Heading sub={identity?.email || session?.user.primaryEmailAddress?.emailAddress || 'Guest progress stays on this device.'}>A place for{`\n`}your progress.</Heading>
    {account.error && <Note tone="warning">{account.error}</Note>}
    {session && <Button kind="secondary" onPress={async()=>{await account.refresh();await reloadAccess(true);}}>Reconnect account</Button>}
    {session && !identity?.confirmed && <>
      <Note>Your sign-in has not finished connecting to FirstLane. Your account access and synced progress are not ready yet.</Note>
      <Button onPress={() => router.push({pathname:'/auth/callback',params:{next:'/account'}})}>Finish connecting account</Button>
      <Button kind="ghost" onPress={async () => { await signOut(); router.replace('/auth/sign-in'); }}>Sign out & try again</Button>
    </>}
    {identity?.confirmed ? <>
      <Button kind="secondary" onPress={() => router.push('/membership')}>Plan & purchase history</Button>
      <Card><Copy size={17} weight="700">Your practice, saved.</Copy><Muted size={12}>{syncStatus === 'synced' ? 'Your completed practice and saved questions are synced.' : 'Completed practice and bookmarks sync while you’re connected. In-progress sessions stay on this device.'}</Muted><Button kind="secondary" disabled={!identity?.confirmed} loading={syncStatus === 'syncing'} onPress={sync}>Sync progress</Button></Card>
      <Button kind="secondary" icon="lock" onPress={() => router.push('/auth/forgot-password')}>Reset password</Button>
      <Button kind="ghost" icon="logout" onPress={async () => { await signOut(); router.replace('/(tabs)'); }}>Sign out</Button>
      <Button kind="ghost" onPress={() => setSheet('reset')}>Clear local practice history</Button>
      <Button kind="danger" icon="trash" onPress={() => { setError(''); setSheet('delete'); }}>Delete account</Button>
    </> : !session ? <><Button onPress={() => router.push('/auth/sign-up')}>Create a free account</Button><Button kind="secondary" onPress={() => router.push('/auth/sign-in')}>Sign in instead</Button><Note>10 guest questions, or 40 fixed questions with a verified free account. Unlimited repeats.</Note></> : null}
    <Sheet visible={!!sheet} onClose={() => setSheet(null)} title={sheet === 'delete' ? 'Delete your account?' : 'Clear this device’s progress?'}>
      <Muted>{sheet === 'delete' ? 'This removes your sign-in account, synced study history and FirstLane access. Paddle may retain payment records. Deletion does not request a refund and removes purchase restoration to this account.' : 'Only this account’s local practice history is cleared. Synced history is unchanged.'}</Muted>
      {sheet === 'delete' && <><Note>For security, sign in again first if your last sign-in was more than 10 minutes ago.</Note><Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters"/></>}
      {error && <Note tone="warning">{error}</Note>}
      <Button kind="danger" disabled={sheet === 'delete' && confirmation !== 'DELETE'} onPress={sheet === 'delete' ? remove : async () => { await resetProgress(); setSheet(null); }}>{sheet === 'delete' ? 'Permanently delete account' : 'Clear local history'}</Button>
      {sheet === 'delete' && <Button kind="secondary" onPress={async () => { await signOut(); router.replace({pathname:'/auth/sign-in',params:{next:'/account'}}); }}>Sign in again</Button>}
      <Button kind="ghost" onPress={() => setSheet(null)}>Keep everything</Button>
    </Sheet>
  </Screen>;
}
