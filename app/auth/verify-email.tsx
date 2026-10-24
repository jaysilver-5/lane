import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { config } from '../../src/config';
import { requireSupabase, humanError } from '../../src/lib/supabase';
import { authRedirect } from '../../src/lib/authRedirect';
import { authDestination } from '../../src/domain/authFlow.mjs';
import { demoVerify } from '../../src/lib/demoAccount';
import { useApp } from '../../src/state/AppState';
import { Button, Chip, Field, Heading, Muted, Note, Screen } from '../../src/components/UI';

export default function Verify() {
  const router = useRouter(), { email = '', next = '/plans' } = useLocalSearchParams<{ email: string; next?: string }>();
  const { refreshIdentity, notify } = useApp();
  const [code, setCode] = useState(''), [error, setError] = useState(''), [lastSent, setLastSent] = useState(0);
  const webLink = Platform.OS === 'web' && config.mode === 'connected';
  const destination = authDestination(next) === 'reset' ? '/plans' : authDestination(next);
  async function verify() {
    setError('');
    try {
      if (config.mode === 'demo') await demoVerify(email, code);
      else if (webLink) {
        const { data, error } = await requireSupabase().auth.getUser();
        if (error || !data.user?.email_confirmed_at) throw new Error('Open the confirmation link in your email using this browser, then try again.');
        if (data.user.email?.toLowerCase() !== email.toLowerCase()) throw new Error('A different account is signed in. Sign out before confirming this email.');
      } else {
        const { error } = await requireSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) throw error;
      }
      await refreshIdentity();
      router.replace(destination as any);
    } catch (failure) { setError(humanError(failure)); }
  }
  async function resend() {
    setError('');
    try {
      if (Date.now() - lastSent < 60000) { notify('Wait a minute before requesting another email.'); return; }
      if (config.mode === 'connected') {
        const { error } = await requireSupabase().auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirect(destination) } });
        if (error) throw error;
      }
      setLastSent(Date.now());
      notify(config.mode === 'demo' ? 'Preview code: 246810' : 'Confirmation email requested. Check your inbox.');
    } catch (failure) { setError(humanError(failure)); }
  }
  return <Screen back title="Verify your email">
    <Chip icon="shield">ONE LAST STEP</Chip>
    <Heading sub={webLink ? `Open the confirmation link sent to ${email}.` : `Enter the code sent to ${email}.`}>Check your inbox.{`\n`}Get road ready.</Heading>
    {webLink && <Note>Open the email link in this browser to finish signing in. If it opens another tab, you can continue there or return here and check confirmation.</Note>}
    {config.mode === 'demo' && <Note>Preview code: 246810. No email has actually been sent.</Note>}
    {!webLink && <Field label="Verification code" placeholder="6-digit code" value={code} onChangeText={text => setCode(text.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />}
    {error ? <Note tone="warning">{error}</Note> : null}
    <Button disabled={!webLink && !/^\d{6}$/.test(code)} onPress={verify}>{webLink ? 'I’ve confirmed my email' : 'Verify & continue'}</Button>
    <Button kind="secondary" onPress={resend}>{webLink ? 'Resend confirmation email' : 'Resend code'}</Button>
    <Muted size={12}>Check spam too. Email verification keeps your progress and any future purchase attached to the right FirstLane account. It never charges you.</Muted>
    <Button kind="ghost" icon={null} onPress={() => router.replace({ pathname: '/auth/sign-up', params: { next: destination } })}>Use a different email</Button>
  </Screen>;
}
