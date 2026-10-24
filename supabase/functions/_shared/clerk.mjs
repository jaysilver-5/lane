// Web-only identity verification. The configured issuer selects keys; token claims never select a URL.
const keyCache = new Map();
export class AccountError extends Error { constructor(message, status = 401) { super(message); this.status = status; } }
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
const jsonPart = value => JSON.parse(new TextDecoder().decode(decode(value)));
export function clerkSettings(env) {
  const issuer = env('CLERK_ISSUER_URL')?.replace(/\/$/, ''), secret = env('CLERK_SECRET_KEY');
  const parties = (env('CLERK_AUTHORIZED_PARTIES') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!issuer || !secret || !parties.length) throw new AccountError('Account services are not configured yet. Guest practice is available.', 503);
  const url = new URL(issuer);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new AccountError('Account configuration is unavailable.', 503);
  return { issuer, secret, parties };
}
export function validateClerkClaims(claims, settings, now = Date.now()) {
  const seconds = now / 1000;
  if (!claims || claims.iss !== settings.issuer || typeof claims.sub !== 'string' || !/^user_[a-zA-Z0-9]+$/.test(claims.sub) || typeof claims.sid !== 'string' || !/^sess_[a-zA-Z0-9]+$/.test(claims.sid)) throw new AccountError('Your session is invalid. Sign in again.');
  if (!Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 30 || claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > seconds + 30)) throw new AccountError('Your session expired. Sign in again.');
  if (!settings.parties.includes(claims.azp) || claims.sts === 'pending') throw new AccountError('Complete sign-in from FirstLane to continue.');
  return claims;
}
export async function verifyClerkToken(token, settings, { fetcher = fetch, now = Date.now() } = {}) {
  try {
    if (typeof token !== 'string' || token.length > 16000) throw new Error();
    const parts = token.split('.'); if (parts.length !== 3) throw new Error();
    const header = jsonPart(parts[0]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit) throw new Error();
    let cached = keyCache.get(settings.issuer), jwk;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!cached || cached.expires <= now || attempt) {
        const response = await fetcher(`${settings.issuer}/.well-known/jwks.json`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new AccountError('Sign-in verification is temporarily unavailable.', 503);
        const body = await response.json();
        if (!Array.isArray(body.keys) || body.keys.length > 30) throw new Error();
        cached = { keys: body.keys, expires: now + 600000 }; keyCache.set(settings.issuer, cached);
      }
      jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'));
      if (jwk) break;
    }
    if (!jwk) throw new Error();
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))) throw new Error();
    return validateClerkClaims(jsonPart(parts[1]), settings, now);
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError('Your session could not be verified. Sign in again.');
  }
}
export async function clerkRequest(path, settings, { method = 'GET', fetcher = fetch } = {}) {
  const response = await fetcher(`https://api.clerk.com/v1${path}`, { method, headers: { Authorization: `Bearer ${settings.secret}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (response.status === 404 && method === 'DELETE') return null;
  if (!response.ok) throw new AccountError(response.status === 404 ? 'Your account is unavailable. Sign in again.' : 'Account verification is temporarily unavailable.', response.status === 404 ? 401 : 503);
  return response.json();
}
export async function verifyClerkRequest(req, env, { requireVerified = true, fetcher = fetch } = {}) {
  const settings = clerkSettings(env), token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new AccountError('Sign in to continue.');
  const claims = await verifyClerkToken(token, settings, { fetcher });
  const [session, user] = await Promise.all([
    clerkRequest(`/sessions/${encodeURIComponent(claims.sid)}`, settings, { fetcher }),
    clerkRequest(`/users/${encodeURIComponent(claims.sub)}`, settings, { fetcher }),
  ]);
  if (session.status !== 'active' || session.user_id !== claims.sub || user.id !== claims.sub || user.banned || user.locked) throw new AccountError('Your session ended. Sign in again.');
  const email = user.email_addresses?.find(e => e.id === user.primary_email_address_id);
  const verified = email?.verification?.status === 'verified';
  if (requireVerified && !verified) throw new AccountError('Verify your email before continuing.', 403);
  return { token, claims, settings, user, email: email?.email_address || '', verified };
}
export async function bindClerkAccount(db, identity) {
  const { claims, email, user } = identity;
  const { data, error } = await db.rpc('firstlane_bind_clerk_account', {
    p_issuer: claims.iss, p_subject: claims.sub, p_session: claims.sid, p_email: email,
    p_name: [user.first_name, user.last_name].filter(Boolean).join(' ').slice(0, 40), p_expires: new Date(claims.exp * 1000).toISOString(),
  });
  if (error || !data?.id) throw new AccountError('Your FirstLane account could not be connected. Please try again.', 503);
  return data;
}
export function accountCors(req, env) {
  const origin = env('WEB_APP_ORIGIN') || '';
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (!origin || req.headers.get('origin') !== origin) throw new AccountError('Origin not allowed.', 403);
  return headers;
}
