import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { HandleSSOCallback, useClerk, useSession, useSignIn, useSignUp } from '@clerk/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Copy, Divider, Field, Heading, Logo, Muted, Note, Screen } from './UI';
import { Checkbox } from './Checkbox';
import { SocialAuthButton, type SocialStrategy } from './SocialAuthButton';
import { useApp } from '../state/AppState';
import { clerkConfigured, useWebAccount } from '../lib/webAccount.web';
import { authDestination } from '../domain/authFlow.mjs';
import { clerkSignupStep } from '../domain/clerkSignup.mjs';
import launchScope from '../../web-launch-scope.json';

const socialStrategies = (['oauth_google', 'oauth_apple'] as const).filter(strategy => launchScope.authenticationMethods.includes(strategy));

type Mode = 'sign-in' | 'sign-up' | 'verify-email' | 'forgot-password' | 'reset-password' | 'callback' | 'sso';
function message(error: unknown): string {
  const e = error as { longMessage?: string; message?: string; errors?: { longMessage?: string; message?: string }[] };
  return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.longMessage || e?.message || 'That did not finish. Please try again.';
}
async function checked(result: Promise<{ error: unknown }>) { const { error } = await result; if (error) throw error; }
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
function destination(value: unknown) { return authDestination(typeof value === 'string' ? value : undefined, '/(tabs)'); }

export function WebAuth({ mode }: { mode: Mode }) {
  const router = useRouter();
  if (!clerkConfigured) return <Screen back title="Your FirstLane account"><Logo/><Heading sub="You can practise the same 10 guest questions as often as you like.">Keep moving forward.</Heading><Note>Account sign-in is being prepared. Guest practice is available now.</Note><Button onPress={() => router.replace('/(tabs)')}>Try the guest questions</Button></Screen>;
  return <AuthFlow mode={mode}/>;
}

function AuthFlow({ mode }: { mode: Mode }) {
  const router = useRouter(), params = useLocalSearchParams<{ next?: string; email?: string }>();
  const next = destination(params.next), callback = `/auth/callback?next=${encodeURIComponent(next)}`;
  const { signIn, fetchStatus: signinFetchStatus } = useSignIn(), { signUp, fetchStatus: signupFetchStatus } = useSignUp(), clerk = useClerk(), { session, isLoaded } = useSession();
  const account = useWebAccount(), { finishOnboarding, colors } = useApp();
  const [email, setEmail] = useState(params.email || ''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [code, setCode] = useState(''), [showPassword, setShowPassword] = useState(false), [accepted, setAccepted] = useState(false), [eligible, setEligible] = useState(false);
  const [error, setError] = useState(''), [sent, setSent] = useState(false), [lastSent, setLastSent] = useState(0), [secondFactor, setSecondFactor] = useState(false);
  const [slow, setSlow] = useState(false);
  const [pendingSocial, setPendingSocial] = useState<SocialStrategy | null>(null);
  const [connectingSocial, setConnectingSocial] = useState<SocialStrategy | null>(null);
  const [completingSocialSignup, setCompletingSocialSignup] = useState(false);
  const [signupAction, setSignupAction] = useState<'created' | 'verified' | null>(null);
  const [showRequirements, setShowRequirements] = useState(false), [finishingSignup, setFinishingSignup] = useState(false);
  const [firstName, setFirstName] = useState(''), [lastName, setLastName] = useState(''), [username, setUsername] = useState('');
  const completionBusy = useRef(false);
  const recoveredSignup = useRef('');
  const [signinAction, setSigninAction] = useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setSlow(true),10000);return()=>clearTimeout(timer);},[]);
  const navigate = (path: string) => router.replace(path as never);
  const navigateSession = ({ session: active, decorateUrl }: { session: { currentTask?: unknown } | null; decorateUrl: (url: string) => string }) => {
    if (active?.currentTask) { setError('Your account needs another security step. Complete it from the account sign-in page.'); return; }
    window.location.assign(decorateUrl(callback));
  };
  async function run(action: () => Promise<void>) { setError(''); try { await action(); } catch (failure) { setError(message(failure)); } }
  function consent() {
    if (!accepted || !eligible) throw new Error('Confirm the terms and that you are 16 or older to continue.');
  }
  async function finishSignIn() {
    setSigninAction(true);
  }
  async function emailSubmit() {
    if (!validEmail(email)) throw new Error('Enter a valid email address.');
    if (mode === 'sign-up') {
      consent();
      if (signUp.status === 'missing_requirements' && signUp.id) {
        if (!signUp.hasPassword || signUp.missingFields.includes('password')) {
          if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
          // password() patches an existing attempt, preserving a verified email
          // when that email has not changed.
          await checked(signUp.password({ password, legalAccepted: true, ...(signUp.emailAddress === email.trim() ? {} : { emailAddress: email.trim() }) }));
        } else await checked(signUp.update({ legalAccepted: true, ...(signUp.emailAddress === email.trim() ? {} : { emailAddress: email.trim() }) }));
      } else {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
        await checked(signUp.password({ emailAddress: email.trim(), password, legalAccepted: true }));
      }
      setSignupAction('created');
    } else {
      await checked(signIn.password({ emailAddress: email.trim(), password })); await finishSignIn();
    }
  }
  async function social(strategy: SocialStrategy) {
    if (!socialStrategies.includes(strategy)) throw new Error('Use email and password to continue.');
    if (connectingSocial) return;
    if (mode === 'sign-up' && (!accepted || !eligible)) { setError(''); setPendingSocial(strategy); return; }
    const args = { strategy, redirectCallbackUrl: `/auth/sso?next=${encodeURIComponent(next)}`, redirectUrl: callback };
    setConnectingSocial(strategy);
    try {
      if (mode === 'sign-up') { consent(); await checked(signUp.sso({ ...args, legalAccepted: true })); }
      else await checked(signIn.sso(args));
    } finally { setConnectingSocial(null); }
  }
  async function sendRecovery() {
    if (!validEmail(email)) throw new Error('Enter a valid email address.');
    if (session) throw new Error('Sign out below before requesting a password reset.');
    if (Date.now() - lastSent < 60000) throw new Error('Wait a minute before requesting another code.');
    await checked(signIn.create({ identifier: email.trim() }));
    await checked(signIn.resetPasswordEmailCode.sendCode()); setSent(true); setLastSent(Date.now());
  }
  async function resetPassword() {
    if (password.length < 8) throw new Error('Use at least 8 characters.');
    if (password !== confirm) throw new Error('Your passwords do not match.');
    if (signIn.status !== 'needs_new_password') await checked(signIn.resetPasswordEmailCode.verifyCode({ code }));
    await checked(signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true }));
    await finishSignIn();
  }
  useEffect(() => {
    if (mode === 'callback' && account.identity?.confirmed && session?.status === 'active' && !session.currentTask) { finishOnboarding(); navigate(next); }
    else if (['sign-up', 'verify-email'].includes(mode) && session?.status === 'active' && !session.currentTask) {
      setError(''); navigate(callback);
    }
  }, [mode, account.identity?.id, account.identity?.confirmed, session?.id, session?.status, session?.currentTask, next]);

  useEffect(() => {
    if (!isLoaded || !['sign-up', 'verify-email'].includes(mode) || !signUp.id || recoveredSignup.current === signUp.id || session) return;
    if (signUp.status === 'complete' || (signUp.verifications.emailAddress.status === 'verified' && signUp.missingFields.length)) {
      recoveredSignup.current = signUp.id; setSignupAction('verified');
    }
  }, [mode, isLoaded, signUp, session]);

  useEffect(() => {
    if (!signinAction || signinFetchStatus === 'fetching') return;
    setSigninAction(false);
    void run(async () => {
      if (signIn.status === 'complete') { await checked(signIn.finalize({ navigate: navigateSession })); return; }
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        if (!signIn.supportedSecondFactors.some(f => f.strategy === 'email_code')) throw new Error('This account requires a security method that is not available on this screen. Use your account recovery method.');
        await checked(signIn.mfa.sendEmailCode()); setSecondFactor(true); setLastSent(Date.now()); return;
      }
      throw new Error('Sign-in needs another step. Please check your account details and try again.');
    });
  }, [signinAction, signIn, signinFetchStatus]);

  // Clerk replaces its signal resources as a request completes. Continue from
  // this render's resource instead of reading the pre-request closure.
  useEffect(() => {
    if (!signupAction || !isLoaded || signupFetchStatus === 'fetching' || completionBusy.current) return;
    const step = clerkSignupStep(signUp, session);
    if (step === 'pending') return;
    setSignupAction(null); setError('');
    if (step === 'connect') return; // The session effect handles this one handoff.
    if (step === 'details') { setCompletingSocialSignup(false); setShowRequirements(true); return; }
    if (step === 'security') { setError('Your sign-in needs an additional security step. Return to sign in to continue.'); return; }
    if (step === 'restart') { setError('This signup attempt has ended. Start again or sign in to your existing account.'); return; }
    if (step === 'finalize') recoveredSignup.current = signUp.id || '';
    completionBusy.current = true; setFinishingSignup(true);
    void (async () => {
      try {
        if (step === 'finalize') await checked(signUp.finalize({ navigate: navigateSession }));
        else {
          if (signupAction === 'created') { await checked(signUp.verifications.sendEmailCode()); setLastSent(Date.now()); }
          setShowRequirements(false);
          if (mode !== 'verify-email') navigate(`/auth/verify-email?next=${encodeURIComponent(next)}&email=${encodeURIComponent(signUp.emailAddress || email.trim())}`);
        }
      } catch (failure) { setError(message(failure)); }
      finally { completionBusy.current = false; setFinishingSignup(false); }
    })();
  }, [signupAction, signUp, signupFetchStatus, isLoaded, session?.id, session?.status, session?.currentTask]);

  if (!isLoaded || !clerk.loaded) return <Screen><Heading>Getting things ready…</Heading>{slow?<><Note>Sign-in is taking longer than usual. Check your connection or keep practising as a guest.</Note><Button onPress={()=>router.replace('/(tabs)')}>Try guest practice</Button></>:<ActivityIndicator color={colors.success}/>}</Screen>;
  if (mode === 'callback') return <Screen><Logo/><Heading sub="Your progress and access stay attached to your FirstLane account.">Connecting your account.</Heading>{account.error || error ? <><Note tone="warning">{account.error || error}</Note><Button onPress={() => run(account.refresh)}>Try again</Button><Button kind="secondary" onPress={() => run(async () => { await account.signOut(); navigate('/auth/sign-in'); })}>Back to sign in</Button></> : session?.currentTask || session?.status === 'pending' ? <><Note>Your sign-in has an unfinished security step. Your FirstLane account is not connected yet.</Note><Button onPress={() => navigate('/auth/sign-in')}>Return to sign in</Button></> : session ? <ActivityIndicator color={colors.success}/> : <><Note>Sign in to finish connecting your account.</Note><Button onPress={() => navigate(`/auth/sign-in?next=${encodeURIComponent(next)}`)}>Sign in</Button></>}</Screen>;

  const signUpMode = mode === 'sign-up', verify = mode === 'verify-email' || secondFactor, recovery = mode === 'forgot-password' || mode === 'reset-password';
  const showReset = recovery && (sent || signIn.status === 'needs_new_password' || mode === 'reset-password' && !!signIn.id);
  const title = verify ? 'Check your inbox.' : recovery ? 'A fresh start.\nSame progress.' : signUpMode ? 'Your practice.\nYour account.' : 'Ready when you are.';
  const consentFields = <View style={{ gap: 8 }}>
    <Checkbox checked={accepted} onChange={setAccepted} label="I agree to the terms and have read the privacy notice."/>
    <Checkbox checked={eligible} onChange={setEligible} label="I am 16 or older. Where required, my parent or guardian has reviewed the terms with me."/>
    <Pressable accessibilityRole="link" onPress={() => router.push('/legal')}><Copy size={12} weight="600" color={colors.success}>Read terms & privacy</Copy></Pressable>
  </View>;
  const missing = signUp.missingFields || [];
  const supportedFields = ['first_name', 'last_name', 'username', 'email_address', 'password', 'legal_accepted'];
  const unsupported = missing.filter(field => !supportedFields.includes(field));
  if (signupAction || finishingSignup || (session?.status === 'active' && ['sign-up', 'verify-email'].includes(mode))) return <Screen><Logo/><Heading>Connecting your account.</Heading><Muted>Checking signup completion and connecting your FirstLane progress.</Muted><ActivityIndicator color={colors.success}/>{slow && <><Note>This is taking longer than usual. If your account was already created, sign in to reconnect it.</Note><Button kind="secondary" onPress={() => navigate('/auth/sign-in')}>Go to sign in</Button></>}</Screen>;
  if (['sign-up', 'verify-email'].includes(mode) && signUp.status === 'complete') return <Screen><Logo/><Heading>Finish connecting your account.</Heading><Muted>Your email is verified. Continue to connect your FirstLane progress.</Muted>{error && <Note tone="warning">{error}</Note>}<Button onPress={() => setSignupAction('verified')}>Continue</Button><Button kind="ghost" onPress={() => navigate('/auth/sign-in')}>Go to sign in</Button></Screen>;
  if (showRequirements && missing.length) return <Screen title="Finish your free account">
    <Logo size={32}/><Heading sub="Your signup is saved. Complete these remaining details here.">One more step.</Heading>
    {missing.includes('first_name') && <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name"/>}
    {missing.includes('last_name') && <Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name"/>}
    {missing.includes('username') && <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username"/>}
    {missing.includes('email_address') && <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"/>}
    {missing.includes('password') && <><Field label="Choose a password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password"/><Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"/></>}
    {missing.includes('legal_accepted') && consentFields}
    {!!unsupported.length && <Note tone="warning">Clerk requires an additional signup method that this form does not support: {unsupported.join(', ')}. Your signup has not finished. Contact support to complete this step.</Note>}
    {error && <Note tone="warning">{error}</Note>}
    <Button disabled={!!unsupported.length || (missing.includes('legal_accepted') && (!accepted || !eligible))} onPress={() => run(async () => {
      const details: Parameters<typeof signUp.update>[0] = {};
      if (missing.includes('first_name')) { if (!firstName.trim()) throw new Error('Enter your first name.'); details.firstName = firstName.trim(); }
      if (missing.includes('last_name')) { if (!lastName.trim()) throw new Error('Enter your last name.'); details.lastName = lastName.trim(); }
      if (missing.includes('username')) { if (!username.trim()) throw new Error('Enter a username.'); details.username = username.trim(); }
      if (missing.includes('email_address')) { if (!validEmail(email)) throw new Error('Enter a valid email address.'); details.emailAddress = email.trim(); }
      if (missing.includes('legal_accepted')) { consent(); details.legalAccepted = true; }
      if (missing.includes('password')) {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
        if (password !== confirm) throw new Error('Your passwords do not match.');
        await checked(signUp.password({ ...details, password }));
      } else await checked(signUp.update(details));
      setSignupAction('created');
    })}>Save & continue</Button>
    <Button kind="ghost" icon={null} onPress={() => navigate('/auth/sign-in')}>Back to sign in</Button>
  </Screen>;
  // A new person can arrive through the sign-in button. Collect signup consent
  // before Clerk's callback component automatically transfers that attempt.
  if (mode === 'sso' && !socialStrategies.length) return <Screen back title="Sign in"><Logo/><Heading sub="Use your email address and password to continue.">Welcome back.</Heading><Button onPress={() => navigate(`/auth/sign-in?next=${encodeURIComponent(next)}`)}>Continue with email</Button></Screen>;
  if (mode === 'sso' && (signIn.isTransferable || completingSocialSignup)) return <Screen title="Create your free account">
    <Logo size={32}/><Heading sub="Your provider is connected. Confirm these details to create your FirstLane account.">Welcome to FirstLane.</Heading>
    {consentFields}
    {error && <Note tone="warning">{error}</Note>}
    <Button disabled={!accepted || !eligible} icon={null} onPress={() => run(async () => {
      consent(); setCompletingSocialSignup(true);
      try {
        await checked(signUp.create({ transfer: true, legalAccepted: true }));
        setSignupAction('created');
      } catch (failure) { setCompletingSocialSignup(false); throw failure; }
    })}>Agree & create my free account</Button>
    <Button kind="ghost" icon={null} onPress={() => navigate('/auth/sign-in')}>Back to sign in</Button>
    <div id="clerk-captcha"/>
  </Screen>;
  if (mode === 'sso') return <Screen><Logo/><Heading>Finishing your sign-in…</Heading><HandleSSOCallback navigateToApp={navigateSession} navigateToSignIn={() => navigate(`/auth/sign-in?next=${encodeURIComponent(next)}`)} navigateToSignUp={() => navigate(`/auth/sign-up?next=${encodeURIComponent(next)}`)}/><Muted>Keep this page open while your account connects.</Muted></Screen>;
  if (pendingSocial && signUpMode) return <Screen title="Create your free account">
    <Logo size={32}/>
    <Heading eyebrow="ONE QUICK STEP" sub="Review these confirmations before we take you to your provider.">Continue with {pendingSocial === 'oauth_google' ? 'Google' : 'Apple'}.</Heading>
    <Muted>Your verified free account includes the same 40 fixed questions, with unlimited repeats.</Muted>
    {consentFields}
    {error && <Note tone="warning">{error}</Note>}
    <Button disabled={!accepted || !eligible} loading={!!connectingSocial} icon={null} onPress={() => run(() => social(pendingSocial))}>Agree & continue to {pendingSocial === 'oauth_google' ? 'Google' : 'Apple'}</Button>
    <Button kind="ghost" icon={null} onPress={() => { setPendingSocial(null); setError(''); }}>Back to signup options</Button>
    <div id="clerk-captcha"/>
  </Screen>;
  return <Screen back title={verify ? 'Verify your email' : recovery ? 'Password recovery' : undefined}>
    <Logo size={32}/>
    <Heading eyebrow={verify ? 'ONE LAST STEP' : recovery ? 'BACK ON TRACK' : signUpMode ? 'FREE ACCOUNT · NO CARD NEEDED' : 'WELCOME BACK'} sub={verify ? `Enter the six-digit code sent to ${signUp.emailAddress || email || 'your email'}.` : recovery ? 'We’ll send a code to your email so you can choose a new password.' : signUpMode ? '40 fixed questions, including the guest 10. Yours to repeat, free.' : 'Sign in to save your progress and pick up where you left off.'}>{title}</Heading>
    {session && !verify && !recovery ? <><Note>You’re already signed in. Continue to connect your account, or sign out to use another account.</Note><Button onPress={() => navigate(callback)}>Continue</Button><Button kind="secondary" onPress={() => run(account.signOut)}>Use another account</Button></> : <>
    {!verify && !recovery && socialStrategies.length > 0 && <>
      <View style={{ gap: 12 }}>
        {socialStrategies.map(strategy => <SocialAuthButton key={strategy} strategy={strategy} busy={connectingSocial === strategy} disabled={!!connectingSocial} onPress={() => run(() => social(strategy))}/>)}
      </View>
      <Muted size={12} style={{ textAlign: 'center' }}>or continue with email</Muted><Divider/>
    </>}
    {!verify && <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email"/>}
    {!verify && !recovery && <Field label="Password" value={password} onChangeText={setPassword} placeholder={signUpMode ? 'At least 8 characters' : 'Your password'} secureTextEntry={!showPassword} autoComplete={signUpMode ? 'new-password' : 'current-password'} accessory={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(!showPassword)}><Copy size={12}>{showPassword ? 'Hide' : 'Show'}</Copy></Pressable>}/>}
    {(verify || showReset) && <Field label={verify ? 'Verification code' : 'Recovery code'} value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={6}/>}
    {showReset && <><Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password"/><Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password"/></>}
    {signUpMode && !verify && !recovery && consentFields}
    {error && <Note tone="warning">{error}</Note>}
    {verify ? <>
      <Button disabled={!/^\d{6}$/.test(code) || !!signupAction} onPress={() => run(async () => {
        if (secondFactor) { await checked(signIn.mfa.verifyEmailCode({ code })); await finishSignIn(); }
        else { await checked(signUp.verifications.verifyEmailCode({ code })); setSignupAction('verified'); }
      })}>Verify & continue</Button>
      <Button kind="secondary" onPress={() => run(async () => { if (Date.now() - lastSent < 60000) throw new Error('Wait a minute before requesting another code.'); await checked(secondFactor ? signIn.mfa.sendEmailCode() : signUp.verifications.sendEmailCode()); setLastSent(Date.now()); })}>Resend code</Button>
      {!secondFactor && <Button kind="ghost" onPress={() => navigate(`/auth/sign-up?next=${encodeURIComponent(next)}`)}>Use a different email</Button>}
    </> : recovery ? <>
      {session ? <Button onPress={() => run(async () => { await account.signOut(); setSent(false); })}>Sign out & reset password</Button> : <Button onPress={() => run(showReset ? resetPassword : sendRecovery)}>{showReset ? 'Save new password' : 'Send recovery code'}</Button>}
      {sent && <><Note>If an eligible account exists, a recovery code has been requested. Check your inbox and spam folder.</Note><Button kind="secondary" onPress={() => run(sendRecovery)}>Resend recovery code</Button></>}
    </> : <>
      <div id="clerk-captcha"/>
      <Button disabled={signUpMode && (!accepted || !eligible)} onPress={() => run(emailSubmit)}>{signUpMode ? 'Create my free account' : 'Sign in with email'}</Button>
      {!signUpMode && <Button kind="ghost" icon={null} onPress={() => navigate(`/auth/forgot-password?next=${encodeURIComponent(next)}`)}>Forgot your password?</Button>}
      <Button kind="secondary" icon={null} onPress={() => navigate(`/auth/${signUpMode ? 'sign-in' : 'sign-up'}?next=${encodeURIComponent(next)}`)}>{signUpMode ? 'Sign in instead' : 'Create a free account'}</Button>
    </>}
    </>}
    <Button kind="ghost" icon={null} onPress={() => { finishOnboarding(); router.replace('/(tabs)'); }}>Keep practising as a guest</Button>
    <Muted size={11}>Guest: 10 fixed questions. Verified account: 40 total. Ontario G1 Complete: CA$14.99 once. No subscription.</Muted>
  </Screen>;
}
