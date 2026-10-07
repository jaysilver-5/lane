import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { requireSupabase } from '../../src/lib/supabase';
import { config } from '../../src/config';
import { demoSignIn } from '../../src/lib/demoAccount';
import { useApp } from '../../src/state/AppState';
import { Icon } from '../../src/components/Icon';
import { Button, Copy, Eyebrow, Field, Heading, Logo, Note, Row, Screen } from '../../src/components/UI';

export default function SignIn() {
    const router = useRouter(), { next } = useLocalSearchParams<{ next?: string }>();
    const { refreshIdentity, finishOnboarding, colors } = useApp();
    const compact = useWindowDimensions().height < 750;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');

    async function signIn() {
        setError('');
        try {
            if (config.mode === 'demo') { await demoSignIn(email, password); await refreshIdentity(); }
            else {
                const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw error;
            }
            router.replace(next === '/checkout' ? '/checkout' : '/(tabs)');
        } catch (e: any) { setError(e.message); }
    }

    return <Screen back footer={<View style={{ gap: 10 }}>
        <Button disabled={!email.trim() || !password} onPress={signIn}>Sign in</Button>
        <Row style={{ justifyContent: 'center', gap: 18 }}>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/auth/sign-up', params: { next: next === '/checkout' ? '/checkout' : '/(tabs)' } })}><Copy size={13} weight="600">Create an account</Copy></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { finishOnboarding(); router.replace('/(tabs)'); }}><Copy size={13} weight="600">Try as guest</Copy></Pressable>
        </Row>
    </View>}>
        {!compact && <Logo size={30} />}
        {compact ? <View style={{ gap: 5 }}><Eyebrow>WELCOME BACK</Eyebrow><Copy size={28} weight="700">Ready when you are.</Copy></View> : <Heading eyebrow="WELCOME BACK" sub="Your practice and access are waiting for you.">Pick up where{`\n`}you left off.</Heading>}
        {config.mode === 'demo' && <Note>{compact ? 'Use the preview account created on this device.' : 'Sign in to a local preview account created on this device.'}</Note>}
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry={!show} autoComplete="current-password" accessory={<Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(!show)} hitSlop={10}><Icon name="eye" color={colors.muted} size={20}/></Pressable>} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/auth/forgot-password')}><Copy size={13} weight="600" color={colors.success}>Forgot your password?</Copy></Pressable>
        {error ? <Note tone="warning">{error}</Note> : null}
    </Screen>;
}
