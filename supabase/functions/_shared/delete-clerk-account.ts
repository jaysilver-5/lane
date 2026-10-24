import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { AccountError, accountCors, clerkRequest, verifyClerkRequest } from './clerk.mjs';
export async function deleteClerkAccount(req: Request) {
  let headers = { 'Cache-Control': 'no-store' };
  try {
    headers = accountCors(req, key => Deno.env.get(key));
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
    const raw = await req.text();
    let confirmation: unknown;
    if (raw.length <= 1024) {
      try { confirmation = JSON.parse(raw)?.confirmation; } catch { /* Invalid JSON is a client error. */ }
    }
    if (confirmation !== 'DELETE') throw new AccountError('Type DELETE to confirm account deletion.', 400);
    const identity = await verifyClerkRequest(req, key => Deno.env.get(key), { requireVerified: false });
    const ages = identity.claims.fva;
    if (!Array.isArray(ages) || typeof ages[0] !== 'number' || ages[0] < 0 || ages[0] > 10) throw new AccountError('Sign in again before deleting your account.', 403);
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new AccountError('Account services are unavailable.', 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc('firstlane_delete_clerk_account', { p_issuer: identity.claims.iss, p_subject: identity.claims.sub });
    if (error || data?.disabled !== true) throw new AccountError('Account deletion did not finish. Please try again.', 503);
    await clerkRequest(`/users/${encodeURIComponent(identity.claims.sub)}`, identity.settings, { method: 'DELETE' });
    return Response.json({ deleted: true }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof AccountError ? error.message : 'Account deletion did not finish. Please try again or contact support.' }, { status: error instanceof AccountError ? error.status : 503, headers });
  }
}
