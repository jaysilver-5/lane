import { authenticatedClient } from './supabase';
import { appWebPath } from './webLocation';

type PaddleEvent = { name: string; data?: { transaction_id?: string } };
type Paddle = {
  Environment: { set: (environment: 'sandbox') => void };
  Initialize: (options: { token: string; eventCallback: (event: PaddleEvent) => void }) => void;
  Checkout: { open: (options: { transactionId: string; settings: { displayMode: 'overlay'; allowLogout: boolean; showAddDiscounts: boolean; successUrl: string } }) => void };
};
const token = process.env.EXPO_PUBLIC_PADDLE_CLIENT_TOKEN || '';
const environment = process.env.EXPO_PUBLIC_PADDLE_ENVIRONMENT || '';
let sdk: Promise<Paddle> | undefined;
export function paddleConfigured() {
  return (environment === 'sandbox' && token.startsWith('test_')) || (environment === 'live' && token.startsWith('live_'));
}
function loadPaddle(): Promise<Paddle> {
  if (!paddleConfigured()) return Promise.reject(new Error('Checkout is temporarily unavailable. No payment has been taken.'));
  if (typeof document === 'undefined') return Promise.reject(new Error('Open checkout in your browser.'));
  if (!sdk) sdk = new Promise<Paddle>((resolve, reject) => {
    // A public payment-link query cannot choose another account's checkout.
    // The authenticated server selects the transaction below.
    const current = new URL(window.location.href);
    if (current.searchParams.has('_ptxn')) {
      current.searchParams.delete('_ptxn');
      window.history.replaceState(null, '', current.href);
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    const timer = setTimeout(() => { script.remove(); reject(new Error('Checkout could not load. Please try again.')); }, 15000);
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Checkout could not load. Please try again.')); };
    script.onload = () => {
      clearTimeout(timer);
      const paddle = (window as unknown as { Paddle?: Paddle }).Paddle;
      if (!paddle) { reject(new Error('Checkout is unavailable. Please try again.')); return; }
      if (environment === 'sandbox') paddle.Environment.set('sandbox');
      paddle.Initialize({ token, eventCallback: event => {
        // Browser events are a reason to recheck the server, never proof of purchase.
        if (event.name === 'checkout.completed') window.dispatchEvent(new Event('firstlane:payment-submitted'));
        if (event.name === 'checkout.closed') window.dispatchEvent(new Event('firstlane:payment-check'));
      } });
      resolve(paddle);
    };
    document.head.appendChild(script);
  }).catch(error => { sdk = undefined; throw error; });
  return sdk;
}
export async function webPurchase(userId: string) {
  const paddle = await loadPaddle();
  const { client } = await authenticatedClient(userId);
  const { data, error } = await client.functions.invoke('paddle-checkout', { body: {} });
  if (error) {
    let message = 'Checkout could not be started. Check purchase status before trying again.';
    try { message = (await error.context?.json())?.error || message; } catch { /* safe message */ }
    throw new Error(message);
  }
  // Re-verify identity after network work, before displaying an account's checkout.
  await authenticatedClient(userId);
  if (data?.status === 'owned' || data?.status === 'pending') return { status: 'pending' as const };
  if (!/^txn_[a-z0-9]{26}$/.test(data?.transactionId) || data.environment !== environment) throw new Error('Checkout configuration does not match. Contact support.');
  paddle.Checkout.open({ transactionId: data.transactionId, settings: {
    displayMode: 'overlay', allowLogout: false, showAddDiscounts: false,
    successUrl: new URL(appWebPath('/checkout?payment=returned'), window.location.origin).href,
  } });
  return { status: 'submitted' as const };
}
