import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { config } from '../../src/config';
import { requireSupabase } from '../../src/lib/supabase';
import { demoVerify } from '../../src/lib/demoAccount';
import { useApp } from '../../src/state/AppState';
import { Button, Chip, Field, Heading, Muted, Note, Screen } from '../../src/components/UI';
export default function Verify() { const router = useRouter(), { email = '', next = '/plans' } = useLocalSearchParams<{
    email: string;
    next?: string;
}>(), { refreshIdentity, notify } = useApp(), [code, setCode] = useState(''), [error, setError] = useState(''), [lastSent, setLastSent] = useState(0); async function verify() { try {
    if (config.mode === 'demo') {
        await demoVerify(email, code);
        await refreshIdentity();
    }
    else {
        const { error } = await requireSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
        if (error)
            throw error;
    }
    router.replace((['/plans', '/checkout'].includes(next) ? next : '/plans') as any);
}
catch (e: any) {
    setError(e.message);
} } return <Screen back title="Verify your email"><Chip icon="shield">ONE LAST STEP</Chip><Heading sub={`Enter the code sent to ${email}.`}>Check your inbox.{`\n`}Get road ready.</Heading>{config.mode === 'demo' && <Note>Preview code: 246810. No email has actually been sent.</Note>}<Field label="Verification code" placeholder="6-digit code" value={code} onChangeText={text => setCode(text.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code"/>{error ? <Note tone="warning">{error}</Note> : null}<Button disabled={!/^\d{6}$/.test(code)} onPress={verify}>Verify & choose my access</Button><Button kind="secondary" onPress={async () => { if (Date.now() - lastSent < 60000) {
    notify('Wait a minute before requesting another code.');
    return;
} if (config.mode === 'connected') {
    const { error } = await requireSupabase().auth.resend({ type: 'signup', email });
    if (error)
        throw error;
} setLastSent(Date.now()); notify(config.mode === 'demo' ? 'Preview code: 246810' : 'A new code was requested. Check your inbox.'); }}>Resend code</Button><Muted size={12}>Check spam too. Email verification keeps your progress and any future purchase attached to the right FirstLane account. It never charges you.</Muted><Button kind="ghost" icon={null} onPress={() => router.replace('/auth/sign-up')}>Use a different email</Button></Screen>; }
