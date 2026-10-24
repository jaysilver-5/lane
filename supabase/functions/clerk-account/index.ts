import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { accountCors, AccountError, bindClerkAccount, verifyClerkRequest } from '../_shared/clerk.mjs';
Deno.serve(async req => {
  let headers = { 'Cache-Control': 'no-store' };
  try {
    headers = accountCors(req, key => Deno.env.get(key));
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
    const identity = await verifyClerkRequest(req, key => Deno.env.get(key));
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new AccountError('Account services are unavailable.', 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return Response.json(await bindClerkAccount(db, identity), { headers });
  } catch (error) {
    return Response.json({ error: error instanceof AccountError ? error.message : 'Your account could not be connected. Please try again.' }, { status: error instanceof AccountError ? error.status : 503, headers });
  }
});
