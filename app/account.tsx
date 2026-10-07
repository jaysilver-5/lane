import { config } from '../src/config';
import { demoDelete } from '../src/lib/demoAccount';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { authenticatedClient } from '../src/lib/supabase';
import { Button, Card, Copy, Field, Heading, MenuItem, Muted, Note, Screen, Sheet } from '../src/components/UI';
export default function Account() {
    const router = useRouter(), { state, auth, identity, patchPreferences, signOut, sync, syncStatus, resetProgress, clearAccountData, notify } = useApp();
    const [sheet, setSheet] = useState<'reset' | 'delete' | null>(null), [confirmation, setConfirmation] = useState('');
    return <Screen back title="Your account"><Heading sub={identity ? identity.email : 'You’re exploring as a guest. Your history stays on this device.'}>A place for{`\n`}your progress.</Heading><Field label="Your display name" placeholder="Your first name" value={state.preferences.name} onChangeText={name => patchPreferences({ name })} maxLength={40}/>{identity ? <><Button kind="secondary" onPress={() => router.push('/membership')}>Plan & billing</Button><Card><Copy size={16} weight="700">Practice backup</Copy><Muted size={12}>{syncStatus === 'synced' ? 'This device was backed up successfully.' : 'A manual backup of your practice history. Use Sync progress on each device to bring its latest results together.'}</Muted><Button kind="secondary" loading={syncStatus === 'syncing'} onPress={config.mode === 'demo' ? () => notify('Test account progress stays on this device. Cloud sync is unavailable in test mode.') : sync} icon="refresh">Sync progress</Button></Card><Button kind="secondary" onPress={() => router.push('/auth/reset-password')} icon="lock">Change password</Button><Button kind="ghost" icon="logout" onPress={async () => { await signOut(); router.replace('/(tabs)'); }}>Sign out</Button></> : <><Button onPress={() => router.push('/auth/sign-up')}>Create an account</Button><Button kind="secondary" icon={null} onPress={() => router.push('/auth/sign-in')}>Sign in instead</Button><Note>Your progress is kept separately for each account. Guests get 10 questions. Create an account for 40 fixed free samples, or buy Ontario G1 Complete once to unlock the full pack.</Note></>}<View><MenuItem icon="trash" title="Clear local practice history" subtitle="This device and current profile only." danger onPress={() => setSheet('reset')}/>{identity && <MenuItem icon="trash" title="Delete account" subtitle="Permanently delete your connected account." danger onPress={() => setSheet('delete')}/>}</View><Sheet visible={!!sheet} onClose={() => setSheet(null)} title={sheet === 'delete' ? 'Delete your account?' : 'Clear this device’s progress?'}><Muted>{sheet === 'delete' ? 'This permanently removes your FirstLane account and its profile, reports and synced practice history, plus this account’s data on this device. Store transaction records may be retained for purchase and refund handling. Deletion does not request a refund and may prevent purchase restoration. Read the privacy policy before continuing.' : 'Your local sessions, bookmarks and review list will be cleared. Cloud backups are not deleted.'}</Muted>{sheet === 'delete' && <Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters"/>}<Button kind="danger" icon="trash" disabled={sheet === 'delete' && confirmation !== 'DELETE'} onPress={async () => {
            if (sheet === 'delete') {
                if (config.mode === 'demo' && identity) {
                    await demoDelete(identity);
                }
                else {
                    const { client } = await authenticatedClient(identity?.id);
                    const { data, error } = await client.functions.invoke('delete-account');
                    if (error) throw error;
                    if (data?.deleted !== true) throw new Error('Account deletion could not be confirmed. Please contact support.');
                }
                await clearAccountData();
                await signOut();
                router.replace('/(tabs)');
            }
            else
                await resetProgress();
            setSheet(null);
        }}> {sheet === 'delete' ? 'Permanently delete account' : 'Clear local progress'}</Button><Button kind="secondary" icon={null} onPress={() => setSheet(null)}>Keep everything</Button></Sheet></Screen>;
}
