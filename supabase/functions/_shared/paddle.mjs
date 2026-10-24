/** Shared Web Crypto implementation: usable by Supabase Edge and Node tests. */
export async function verifyPaddleSignature(raw, header, secret, now = Date.now()) {
  if (!secret || !header || raw.length > 200000) return false;
  const fields = header.split(';').map(part => part.trim().split('='));
  const timestamp = fields.find(([key]) => key === 'ts')?.[1];
  if (!/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const signatures = fields.filter(([key, value]) => key === 'h1' && /^[a-f0-9]{64}$/.test(value || '')).map(([, value]) => value);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const signature of signatures) {
    const bytes = Uint8Array.from(signature.match(/../g), hex => parseInt(hex, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`${timestamp}:${raw}`))) return true;
  }
  return false;
}
export function assertPaddlePrice(price) {
  if (!price || price.status !== 'active' || price.billing_cycle != null || price.trial_period != null ||
      price.unit_price_overrides?.length || price.unit_price?.currency_code !== 'CAD' || price.unit_price?.amount !== '1499') {
    throw new Error('Configure an active, one-time CAD 14.99 Paddle price.');
  }
}
export function assertPaddleTransaction(transaction, priceId, completed = false) {
  const item = transaction?.items?.[0];
  if (!/^txn_[a-z0-9]{26}$/.test(transaction?.id || '') || transaction.items?.length !== 1 || item.quantity !== 1 ||
      item.price?.id !== priceId || transaction.currency_code !== 'CAD' || transaction.subscription_id != null ||
      transaction.discount_id != null || Number(transaction.details?.totals?.discount || 0) !== 0 ||
      (completed && transaction.status !== 'completed')) throw new Error('Unexpected Paddle transaction.');
  // A historical purchase stays valid if its catalog price is later archived.
  assertPaddlePrice({ ...item.price, status: 'active' });
  const data = transaction.custom_data;
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(data?.checkout_id || '') ||
      !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(data?.user_id || '') || data?.pack_key !== 'CA-ON-G1') {
    throw new Error('Transaction is not linked to a FirstLane checkout.');
  }
}
export function paddleApi(environment) {
  if (environment !== 'sandbox' && environment !== 'live') throw new Error('Invalid Paddle environment.');
  return environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}
export async function paddleRequest(path, environment, apiKey, options = {}) {
  const response = await fetch(paddleApi(environment) + path, {
    ...options, signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Paddle-Version': '1', ...options.headers },
  });
  if (!response.ok) {
    const error = new Error('Payment service request failed.');
    error.status = response.status;
    const body = await response.json().catch(() => null);
    // Keep only Paddle's machine-readable code, never its raw response or credentials.
    if (/^[a-z0-9_]{1,80}$/.test(body?.error?.code || '')) error.paddleCode = body.error.code;
    throw error;
  }
  return (await response.json()).data;
}
