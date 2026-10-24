import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { requireSupabase, humanError } from '../../src/lib/supabase';
import { Button, Heading, Note, Screen } from '../../src/components/UI';
import { authCallbackError } from '../../src/domain/authFlow.mjs';
import { useApp } from '../../src/state/AppState';
export default function Callback() {
    const router = useRouter(), params = useLocalSearchParams<{
        code?: string;
        next?: string;
    }>(), url = Linking.useURL(), [error, setError] = useState('');
    const exchange = useRef<{ code: string; job: Promise<any> } | null>(null);
    const { refreshIdentity, finishOnboarding } = useApp();
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const incoming = url ?? await Linking.getInitialURL();
                if (Platform.OS === 'web') {
                    const failure = authCallbackError(window.location.href);
                    if (failure) throw new Error(failure);
                }
                const code = params.code ?? (incoming ? Linking.parse(incoming).queryParams?.code : undefined);
                if (typeof code === 'string') {
                    if (exchange.current?.code !== code) exchange.current = { code, job: requireSupabase().auth.exchangeCodeForSession(code) };
                    const { error } = await exchange.current.job;
                    if (error)
                        throw error;
                }
                else {
                    const { data } = await requireSupabase().auth.getSession();
                    if (!data.session)
                        throw new Error('This sign-in link is missing or expired. Please try signing in again.');
                }
                await refreshIdentity();
                if (!cancelled) {
                    finishOnboarding();
                    if (Platform.OS === 'web') window.history.replaceState(null, '', '/auth/callback');
                    router.replace(params.next === 'reset' ? '/auth/reset-password' : params.next === '/checkout' ? '/checkout' : params.next === '/plans' ? '/plans' : '/(tabs)');
                }
            }
            catch (e) {
                if (!cancelled)
                    setError(humanError(e));
            }
        })();
        return () => { cancelled = true; };
    }, [params.code, url]);
    return <Screen><Heading>{error ? 'Let’s try that again.' : 'Getting things ready…'}</Heading>{error ? <><Note tone="warning">{error}</Note><Button onPress={() => router.replace('/auth/sign-in')}>Back to sign in</Button></> : <ActivityIndicator />}</Screen>;
}
