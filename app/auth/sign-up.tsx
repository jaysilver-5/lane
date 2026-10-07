import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { requireSupabase } from '../../src/lib/supabase';
import { config } from '../../src/config';
import { useApp } from '../../src/state/AppState';
import { demoRegister, validateCredentials } from '../../src/lib/demoAccount';
import { Icon } from '../../src/components/Icon';
import { Checkbox } from '../../src/components/Checkbox';
import { Button, Copy, Eyebrow, Field, Heading, Logo, Muted, Note, Row, Screen } from '../../src/components/UI';

export default function SignUp() {
    const router = useRouter();
    const { next } = useLocalSearchParams<{ next?: string }>();
    const { state, colors, finishOnboarding } = useApp();
    const height = useWindowDimensions().height;
    const compact = height < 750;
    const veryShort = height < 620;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState('');
    const destination = ['/checkout'].includes(next || '') ? next : '/plans';

    async function create() {
        setError('');
        try {
            validateCredentials(email, password);
            if (!accepted) throw new Error('Accept the terms and privacy notice to continue.');
            if (config.mode === 'demo') await demoRegister(email, password, state.preferences.name);
            else {
                const { error } = await requireSupabase().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { display_name: state.preferences.name, terms_version: '2026-10-v4' }, emailRedirectTo: Linking.createURL('auth/callback', { queryParams: { next: destination || '/(tabs)' } }) } });
                if (error) throw error;
            }
            finishOnboarding();
            router.push({ pathname: '/auth/verify-email', params: { email: email.trim().toLowerCase(), next: destination } });
        } catch (e: any) { setError(e.message); }
    }

    return <Screen back footer={<View style={{ gap: 10 }}>
        <Button onPress={create}>Create my free account</Button>
        <Row style={{ justifyContent: 'center', gap: 18 }}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth/sign-in')}><Copy size={13} weight="600">Sign in instead</Copy></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { finishOnboarding(); router.replace('/(tabs)'); }}><Copy size={13} weight="600">Try as guest</Copy></Pressable>
        </Row>
    </View>}>
        {!compact && <Logo size={30} />}
        {compact ? <View style={{ gap: veryShort ? 3 : 5 }}><Eyebrow>FREE ACCOUNT · NO CARD NEEDED</Eyebrow><Copy size={veryShort ? 24 : 28} weight="700">Your practice. Your account.</Copy><Muted size={12}>40 free samples. Progress saved on this device.</Muted></View> : <Heading eyebrow="FREE ACCOUNT · NO CARD NEEDED" sub="40 sample questions and progress saved on this device.">Your practice.{`\n`}Your account.</Heading>}
        {config.mode === 'demo' && (veryShort ? <Muted size={11}>Preview only. Use a throwaway password.</Muted> : <Note>{compact ? 'Preview only. Use a throwaway password.' : 'Local preview account. Use a test email and throwaway password; no email is sent.'}</Note>)}
        <Field label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry={!show} autoComplete="new-password" accessory={<Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(!show)} hitSlop={10}><Icon name="eye" color={colors.muted} size={20}/></Pressable>} />
        <Checkbox checked={accepted} onChange={setAccepted} label="I agree to the terms and have read the privacy notice." />
        <Pressable accessibilityRole="link" onPress={() => router.push('/legal')}><Copy size={12} weight="600" color={colors.success}>Read terms & privacy</Copy></Pressable>
        {error ? <Note tone="warning">{error}</Note> : null}
        {!compact && <Muted size={11}>Creating an account is free. Any purchase is separate.</Muted>}
    </Screen>;
}
