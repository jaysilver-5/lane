import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { config } from '../../src/config';
import { requireSupabase } from '../../src/lib/supabase';
import { demoResetPassword } from '../../src/lib/demoAccount';
import { useApp } from '../../src/state/AppState';
import { Button, Field, Heading, Note, Screen } from '../../src/components/UI';
export default function Reset() { const router = useRouter(), params = useLocalSearchParams<{
    email?: string;
}>(), { identity, notify } = useApp(), [code, setCode] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [error, setError] = useState(''); const email = params.email || identity?.email || ''; async function submit() { try {
    if (password.length < 8)
        throw new Error('Use at least 8 characters.');
    if (password !== confirm)
        throw new Error('Your passwords do not match.');
    if (config.mode === 'demo')
        await demoResetPassword(email, code, password);
    else {
        const db = requireSupabase();
        if (params.email) {
            const { error } = await db.auth.verifyOtp({ email, token: code, type: 'recovery' });
            if (error)
                throw error;
        }
        const { error } = await db.auth.updateUser({ password });
        if (error)
            throw error;
    }
    notify('Password updated. Your access has not changed.');
    router.replace(identity ? '/account' : '/auth/sign-in');
}
catch (e: any) {
    setError(e.message);
} } return <Screen back title="Set a new password"><Heading sub="Use a password you don’t use elsewhere.">Back on track.</Heading>{(params.email || config.mode === 'demo') && <Field label="Recovery code" placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6}/>}<Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry/><Field label="Confirm new password" value={confirm} onChangeText={setConfirm} placeholder="Enter it again" secureTextEntry/>{config.mode === 'demo' && <Note>Use preview code 246810. This changes only the local test password.</Note>}{error ? <Note tone="warning">{error}</Note> : null}<Button onPress={submit}>Save new password</Button></Screen>; }
