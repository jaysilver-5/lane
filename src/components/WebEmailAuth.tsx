import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useClerk, useSession, useSignIn, useSignUp } from '@clerk/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Field, Heading, Logo, Muted, Note, Screen } from './UI';
import { Checkbox } from './Checkbox';
import { useApp } from '../state/AppState';
import { authDestination } from '../domain/authFlow.mjs';
import { appWebPath } from '../lib/webLocation';

function failureMessage(failure: unknown) {
  const error = failure as { message?: string; errors?: { longMessage?: string; message?: string }[] };
  return error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || 'That did not finish. Please try again.';
}
function needsSignup(failure: unknown) {
  return (failure as { errors?: { code?: string }[] })?.errors?.some(error => error.code === 'sign_up_if_missing_transfer');
}
async function checked(request: Promise<{ error: unknown }>) { const { error } = await request; if (error) throw error; }

/** One email-code entry point; verified existing identities keep their Clerk user ID. */
export function WebEmailAuth() {
  const router = useRouter(), params = useLocalSearchParams<{ next?: string; email?: string }>();
  const next = authDestination(typeof params.next === 'string' ? params.next : undefined, '/(tabs)');
  const callback = `/auth/callback?next=${encodeURIComponent(next)}`;
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { session, isLoaded } = useSession(), clerk = useClerk(), { colors, finishOnboarding } = useApp();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState(''), [error, setError] = useState('');
  const [phase, setPhase] = useState<'email' | 'code' | 'consent' | 'details'>('email');
  const [action, setAction] = useState<'send' | 'sign-in' | 'sign-up' | null>(null);
  const [accepted, setAccepted] = useState(false), [eligible, setEligible] = useState(false);
  const [firstName, setFirstName] = useState(''), [lastName, setLastName] = useState(''), [username, setUsername] = useState('');
  const [pending, setPending] = useState(false), [secondFactor, setSecondFactor] = useState(false);
  const [lastSent, setLastSent] = useState(0), [secondsLeft, setSecondsLeft] = useState(0);
  const working = useRef(false), continuing = useRef(false);
  const busy = pending || !!action;
  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((lastSent + 60000 - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [lastSent]);
  const navigateSession = ({ session: active, decorateUrl }: { session: { currentTask?: unknown; status?: string } | null; decorateUrl: (url: string) => string }) => {
    if (!active || active.currentTask || active.status === 'pending') throw new Error('Your account needs another security step. Use password sign-in or contact support.');
    window.location.assign(decorateUrl(appWebPath(callback)));
  };
  async function run(task: () => Promise<void>) {
    if (working.current) return;
    working.current = true; setPending(true); setError('');
    try { await task(); } catch (failure) { setError(failureMessage(failure)); }
    finally { working.current = false; setPending(false); }
  }
  function validateEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid email address.');
  }
  async function send() {
    validateEmail();
    // Verification happens before revealing whether an account exists.
    await checked(signIn.create({ identifier: email.trim(), signUpIfMissing: true }));
    setAction('send');
  }
  async function verify() {
    if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your email.');
    if (secondFactor) await checked(signIn.mfa.verifyEmailCode({ code }));
    else {
      const result = await signIn.emailCode.verifyCode({ code });
      if (needsSignup(result.error)) { setPhase('consent'); setCode(''); return; }
      if (result.error) throw result.error;
    }
    setAction('sign-in');
  }
  async function createAccount() {
    if (!accepted || !eligible) throw new Error('Confirm the terms and that you are 16 or older to continue.');
    // Transfer only after email ownership AND explicit signup consent.
    await checked(signUp.create({ transfer: true, legalAccepted: true }));
    setAction('sign-up');
  }
  // Clerk replaces hook resources after requests. Finalize the latest resource,
  // never the snapshot captured before verifying the code or creating signup.
  useEffect(() => {
    if (!action || !isLoaded || pending || working.current || continuing.current || signInFetchStatus === 'fetching' || signUpFetchStatus === 'fetching') return;
    continuing.current = true;
    void run(async () => {
      try {
        if (action === 'send') {
          await checked(signIn.emailCode.sendCode()); setLastSent(Date.now()); setSecondsLeft(60); setCode(''); setSecondFactor(false); setPhase('code');
        } else if (action === 'sign-in') {
          if (signIn.status === 'complete') await checked(signIn.finalize({ navigate: navigateSession }));
          else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
            if (!signIn.supportedSecondFactors.some(factor => factor.strategy === 'email_code')) throw new Error('Your account requires another security method. Use password sign-in or contact support.');
            await checked(signIn.mfa.sendEmailCode()); setLastSent(Date.now()); setSecondsLeft(60); setCode(''); setSecondFactor(true); setPhase('code');
          } else throw new Error('Sign-in needs another step. Please try again.');
        } else {
          if (signUp.status === 'complete') await checked(signUp.finalize({ navigate: navigateSession }));
          else if (signUp.status === 'missing_requirements') setPhase('details');
          else throw new Error('Your account could not be connected. Please try again.');
        }
      } finally { setAction(null); continuing.current = false; }
    });
  }, [action, signIn, signUp, signInFetchStatus, signUpFetchStatus, isLoaded, pending]);

  const passwordPath = `/auth/sign-in?method=password&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email.trim())}`;
  const consentFields = <View style={{ gap: 8 }}>
    <Checkbox checked={accepted} onChange={setAccepted} disabled={busy} label="I agree to the terms and have read the privacy notice."/>
    <Checkbox checked={eligible} onChange={setEligible} disabled={busy} label="I am 16 or older. Where required, my parent or guardian has reviewed the terms with me."/>
    <Button kind="ghost" icon={null} onPress={() => router.push('/legal')}>Read terms & privacy</Button>
  </View>;
  const missing = signUp.missingFields || [];
  const unsupported = missing.filter(field => !['first_name', 'last_name', 'username', 'legal_accepted'].includes(field));
  if (!isLoaded || !clerk.loaded) return <Screen><Heading>Getting things ready…</Heading><ActivityIndicator color={colors.success}/></Screen>;
  return <Screen back title="Continue with email">
    <Logo size={32}/>
    <Heading eyebrow={phase === 'email' ? 'YOUR FIRSTLANE ACCOUNT' : phase === 'code' ? 'CHECK YOUR INBOX' : 'YOUR FREE ACCOUNT'}
      sub={phase === 'email' ? 'New here or coming back? We’ll email you a code. No password needed.' : phase === 'code' ? `Enter the six-digit code sent to ${email.trim()}. Check spam if you don’t see it.` : 'Your email is verified. Confirm these details to finish creating your account.'}>
      {phase === 'email' ? 'Your next step starts here.' : phase === 'code' ? 'A code, and you’re in.' : 'Make it your journey.'}
    </Heading>
    {error && <Note tone="warning">{error}</Note>}
    {session ? <>
      <Note>You’re already signed in. Continue to your practice.</Note>
      <Button onPress={() => router.replace(callback as never)}>Continue</Button>
    </> : phase === 'email' ? <>
      <Field label="Email address" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" onSubmitEditing={() => { if (!busy) void run(send); }}/>
      <Button disabled={busy} loading={busy} onPress={() => run(send)}>Continue with email</Button>
      <Muted size={12}>We’ll remember you in this browser while your session is active.</Muted>
      <Button kind="ghost" icon={null} disabled={busy} onPress={() => router.replace(passwordPath as never)}>Use my password instead</Button>
      <div id="clerk-captcha"/>
    </> : phase === 'code' ? <>
      {secondFactor && <Note>One more email check is needed to secure your account.</Note>}
      <Field label="Verification code" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} editable={!busy} autoComplete="one-time-code" keyboardType="number-pad" placeholder="6-digit code" maxLength={6} onSubmitEditing={() => { if (!busy) void run(verify); }}/>
      <Button disabled={busy || !/^\d{6}$/.test(code)} loading={busy} onPress={() => run(verify)}>Verify & continue</Button>
      <Button kind="secondary" disabled={busy || secondsLeft > 0} icon={null} onPress={() => run(async () => {
        if (Date.now() - lastSent < 60000) throw new Error('Wait a minute before requesting another code.');
        await checked(secondFactor ? signIn.mfa.sendEmailCode() : signIn.emailCode.sendCode()); setLastSent(Date.now()); setSecondsLeft(60);
      })}>{secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}</Button>
      <Button kind="ghost" icon={null} disabled={busy} onPress={() => { setPhase('email'); setCode(''); setError(''); setSecondFactor(false); }}>Use a different email</Button>
      <Button kind="ghost" icon={null} disabled={busy} onPress={() => router.replace(passwordPath as never)}>Use my password instead</Button>
    </> : <>
      {consentFields}
      {phase === 'details' && <>
        {missing.includes('first_name') && <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name"/>}
        {missing.includes('last_name') && <Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name"/>}
        {missing.includes('username') && <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username"/>}
        {!!unsupported.length && <Note tone="warning">Your account needs an additional setup step. Please contact support to finish creating your account.</Note>}
      </>}
      <Button disabled={busy || !accepted || !eligible || phase === 'details' && !!unsupported.length} loading={busy} onPress={() => run(phase === 'consent' ? createAccount : async () => {
        if (!accepted || !eligible) throw new Error('Confirm the terms and that you are 16 or older to continue.');
        if (missing.includes('first_name') && !firstName.trim() || missing.includes('last_name') && !lastName.trim() || missing.includes('username') && !username.trim()) throw new Error('Complete the required account details.');
        await checked(signUp.update({ legalAccepted: true, ...(missing.includes('first_name') ? { firstName: firstName.trim() } : {}), ...(missing.includes('last_name') ? { lastName: lastName.trim() } : {}), ...(missing.includes('username') ? { username: username.trim() } : {}) }));
        setAction('sign-up');
      })}>Create my free account</Button>
      <Muted size={12}>40 fixed questions, including the guest 10. Yours to repeat, free.</Muted>
      <div id="clerk-captcha"/>
    </>}
    <Button kind="ghost" icon={null} disabled={busy} onPress={() => { finishOnboarding(); router.replace('/(tabs)'); }}>Keep practising as a guest</Button>
  </Screen>;
}
