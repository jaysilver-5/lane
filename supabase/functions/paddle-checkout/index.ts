import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { assertPaddlePrice, assertPaddleTransaction, paddleRequest } from '../_shared/paddle.mjs';
import { AccountError, bindClerkAccount, verifyClerkRequest } from '../_shared/clerk.mjs';

Deno.serve(async req => {
  const origin = Deno.env.get('WEB_APP_ORIGIN') || '';
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
  if (!origin || req.headers.get('origin') !== origin) return reply({ error: 'Origin not allowed.' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('PADDLE_API_KEY'), priceId = Deno.env.get('PADDLE_PRICE_ID');
  const environment = Deno.env.get('PADDLE_ENVIRONMENT') || '';
  if (!url || !key || !apiKey || !priceId || !['sandbox', 'live'].includes(environment)) return reply({ error: 'Checkout is not configured yet. No payment has been taken.' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let user: { id: string };
  try { user = await bindClerkAccount(db, await verifyClerkRequest(req, name => Deno.env.get(name))); }
  catch (error) { return reply({ error: error instanceof AccountError ? error.message : 'Account verification is unavailable.' }, error instanceof AccountError ? error.status : 503); }
  let reservation: { id: string; transaction_id?: string; fresh?: boolean; status: string } | undefined;
  let stage = 'price_lookup';
  try {
    const price = await paddleRequest(`/prices/${priceId}`, environment, apiKey);
    stage = 'price_validation';
    assertPaddlePrice(price);
    if (price.tax_mode !== 'external') throw new Error('The checkout price must exclude tax.');
    stage = 'checkout_reservation';
    const { data, error: reserveError } = await db.rpc('firstlane_paddle_reserve', { p_user: user.id, p_environment: environment });
    if (reserveError) throw reserveError;
    reservation = data;
    if (!reservation) throw new Error('No checkout reservation.');
    if (reservation.status === 'owned') return reply({ status: 'owned' });
    if (!reservation.fresh && !reservation.transaction_id) return reply({ status: 'pending' });
    let transaction;
    if (reservation.transaction_id) {
      stage = 'transaction_lookup';
      transaction = await paddleRequest(`/transactions/${reservation.transaction_id}`, environment, apiKey);
      assertPaddleTransaction(transaction, priceId);
      if (transaction.custom_data.user_id !== user.id || transaction.custom_data.checkout_id !== reservation.id) throw new Error('Checkout ownership mismatch.');
      if (['paid', 'completed'].includes(transaction.status)) return reply({ status: 'pending' });
      if (transaction.status === 'canceled') {
        const { error } = await db.rpc('firstlane_paddle_attach', { p_id: reservation.id, p_transaction: transaction.id, p_status: 'canceled' });
        if (error) throw error;
        return reply({ error: 'The previous checkout was cancelled. You can start again.' }, 409);
      }
      if (!['draft', 'ready'].includes(transaction.status)) return reply({ status: 'pending' });
      // Reassigning the same catalog ID can retain the old price snapshot.
      // Retire an unpaid stale quote through Paddle before allowing a new one.
      if (transaction.items[0].price.tax_mode !== 'external') {
        stage = 'stale_quote_cancellation';
        const canceled = await paddleRequest(`/transactions/${reservation.transaction_id}`, environment, apiKey, {
          method: 'PATCH', body: JSON.stringify({ status: 'canceled' }),
        });
        if (canceled.id !== reservation.transaction_id || canceled.status !== 'canceled') throw new Error('Checkout cancellation was not confirmed.');
        const { error } = await db.rpc('firstlane_paddle_attach', { p_id: reservation.id, p_transaction: canceled.id, p_status: 'canceled' });
        if (error) throw error;
        return reply({ error: 'The old unpaid quote was canceled because its tax setting changed. Open checkout again for CA$14.99 plus applicable tax.' }, 409);
      }
    } else {
      stage = 'transaction_creation';
      // The reservation is durable before the external request. An uncertain result is
      // retained for reconciliation rather than silently creating a duplicate charge.
      try {
        transaction = await paddleRequest('/transactions', environment, apiKey, { method: 'POST', body: JSON.stringify({
          items: [{ price_id: priceId, quantity: 1 }], currency_code: 'CAD', collection_mode: 'automatic',
          custom_data: { checkout_id: reservation.id, user_id: user.id, pack_key: 'CA-ON-G1' },
          // Use Paddle's configured payment link. The CORS/browser origin may be
          // HTTP during local testing and is not an approved HTTPS payment link.
        }) });
      } catch (error) {
        // Only definitive validation failures permit a fresh checkout on retry.
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) await db.rpc('firstlane_paddle_attach', { p_id: reservation.id, p_transaction: null, p_status: 'failed' });
        throw error;
      }
    }
    stage = 'transaction_validation';
    assertPaddleTransaction(transaction, priceId);
    if (transaction.custom_data.user_id !== user.id || transaction.custom_data.checkout_id !== reservation.id) throw new Error('Checkout ownership mismatch.');
    if (['paid', 'completed'].includes(transaction.status)) return reply({ status: 'pending' });
    if (!['draft', 'ready'].includes(transaction.status) || transaction.items[0].price.tax_mode !== 'external') throw new Error('Checkout price could not be refreshed.');
    stage = 'transaction_attachment';
    const { error: attachError } = await db.rpc('firstlane_paddle_attach', { p_id: reservation.id, p_transaction: transaction.id, p_status: 'ready' });
    if (attachError) throw attachError;
    return reply({ transactionId: transaction.id, environment });
  } catch (failure) {
    const diagnostic = failure as { status?: number; paddleCode?: string; code?: string };
    const status = Number.isInteger(diagnostic.status) ? diagnostic.status : undefined;
    const providerCode = /^[a-z0-9_]{1,80}$/.test(diagnostic.paddleCode || '') ? diagnostic.paddleCode : undefined;
    const databaseCode = /^[A-Z0-9]{5}$/.test(diagnostic.code || '') ? diagnostic.code : undefined;
    console.error('Paddle checkout failed', JSON.stringify({ stage, status, providerCode, databaseCode, checkout: reservation?.id || null }));
    const reference = [stage, status, providerCode, databaseCode].filter(Boolean).join(':');
    const error = reservation
      ? 'Checkout could not be prepared. If payment may have started, check purchase status or contact support before paying again.'
      : 'Checkout is temporarily unavailable. No payment has been taken.';
    return reply({ error, reference }, 503);
  }
});
