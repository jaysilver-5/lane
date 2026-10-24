import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { assertPaddleTransaction, paddleRequest, verifyPaddleSignature } from '../_shared/paddle.mjs';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET'), apiKey = Deno.env.get('PADDLE_API_KEY');
  const environment = Deno.env.get('PADDLE_ENVIRONMENT') || '', priceId = Deno.env.get('PADDLE_PRICE_ID');
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const missing = Object.entries({ PADDLE_WEBHOOK_SECRET: secret, PADDLE_API_KEY: apiKey, PADDLE_PRICE_ID: priceId, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key })
    .filter(([, value]) => !value).map(([name]) => name);
  if (!['sandbox', 'live'].includes(environment)) missing.push('PADDLE_ENVIRONMENT');
  if (missing.length) {
    // Configuration names only: never log credential values or webhook bodies.
    console.error('Paddle webhook configuration missing', JSON.stringify(missing));
    return new Response('Webhook not configured', { status: 503 });
  }
  const raw = await req.text();
  if (!await verifyPaddleSignature(raw, req.headers.get('paddle-signature'), secret)) return new Response('Invalid signature', { status: 401 });
  let event;
  try { event = JSON.parse(raw); } catch { return new Response('Invalid event', { status: 400 }); }
  if (!/^evt_[a-z0-9]{26}$/.test(event.event_id) || !Number.isFinite(Date.parse(event.occurred_at))) return new Response('Invalid event', { status: 400 });
  if (!['transaction.completed', 'adjustment.created', 'adjustment.updated'].includes(event.event_type)) return Response.json({ ignored: true });
  try {
    const adjustment = event.event_type.startsWith('adjustment.') ? event.data : null;
    const transactionId = adjustment ? adjustment.transaction_id : event.data.id;
    if (!/^txn_[a-z0-9]{26}$/.test(transactionId || '')) return new Response('Invalid transaction', { status: 400 });
    // Consult the matching Paddle account as well as verifying the event signature.
    const transaction = await paddleRequest(`/transactions/${transactionId}`, environment, apiKey);
    // Tervlon Labs sells multiple products through this Paddle account. Only
    // unrelated, well-formed price lists can be acknowledged without fulfillment.
    const items = transaction?.items;
    if (Array.isArray(items) && items.length > 0 &&
        items.every(item => /^pri_[a-z0-9]{26}$/.test(item?.price?.id || '')) &&
        !items.some(item => item.price.id === priceId)) {
      return Response.json({ ignored: true, reason: 'unrelated_product' });
    }
    assertPaddleTransaction(transaction, priceId, true);
    const normalized = {
      id: event.event_id, type: event.event_type, environment, occurred_at: event.occurred_at,
      transaction_id: transaction.id, checkout_id: transaction.custom_data.checkout_id,
      user_id: transaction.custom_data.user_id, currency: 'CAD', amount_minor: 1499,
      purchased_at: transaction.billed_at || transaction.created_at,
      adjustment: adjustment ? { id: adjustment.id, action: adjustment.action, status: adjustment.status } : null,
    };
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.rpc('firstlane_apply_paddle_event', { p_event: normalized });
    if (error) { console.error('Paddle fulfillment failed', event.event_id, error.code); return new Response('Processing failed; retry required', { status: 500 }); }
    return Response.json(data);
  } catch {
    console.error('Paddle event needs retry or review', event.event_id);
    return new Response('Processing failed; retry required', { status: 500 });
  }
});
