import React, { useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { config } from '../../src/config';
import { requireSupabase } from '../../src/lib/supabase';
import { Button, Field, Heading, Note, Screen } from '../../src/components/UI';
export default function Forgot() { const router = useRouter(), [email, setEmail] = useState(''), [sent, setSent] = useState(false); return <Screen back title="Password recovery"><Heading sub="We’ll help you find your way back. Your plan and practice history stay attached to your account.">A fresh start.{`\n`}Same progress.</Heading><Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address"/>{sent && <Note>If an eligible account exists, a recovery code has been requested. {config.mode === 'demo' ? 'Preview code: 246810. No email is sent.' : ''}</Note>}<Button onPress={async () => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Enter a valid email address.'); if (config.mode === 'connected') {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('auth/callback', { queryParams: { next: 'reset' } }) });
    if (error)
        throw error;
} setSent(true); }}>Send recovery code</Button>{sent && <Button kind="secondary" onPress={() => router.push({ pathname: '/auth/reset-password', params: { email } })}>I have my recovery code</Button>}<Button kind="ghost" onPress={() => router.replace('/auth/sign-in')}>Back to sign in</Button></Screen>; }
