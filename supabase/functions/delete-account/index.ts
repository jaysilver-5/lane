// Deploy to the intended Supabase environment after reviewing its retention rules. The service-role key stays on this server.
import { createClient } from 'npm:@supabase/supabase-js@2';
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in before deleting your account.' }, 401);
  const url = Deno.env.get('SUPABASE_URL'), secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) return json({ error: 'Server configuration is incomplete.' }, 503);
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  // Verify the token with Auth, not a user ID supplied by the client.
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
  if (deletionError) return json({ error: 'Deletion did not finish. Please try again.' }, 500);
  return json({ deleted: true });
});
