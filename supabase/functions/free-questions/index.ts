import { AccountError, accountCors, verifyClerkRequest } from '../_shared/clerk.mjs';
import samples from '../_shared/free-questions.json' with { type: 'json' };
Deno.serve(async req => {
  let headers = { 'Cache-Control': 'no-store' };
  try {
    headers = accountCors(req, key => Deno.env.get(key));
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
    await verifyClerkRequest(req, key => Deno.env.get(key));
    if (Deno.env.get('PADDLE_ENVIRONMENT') === 'live' && !samples.approved) throw new AccountError('The reviewed practice questions are not available yet.', 503);
    return Response.json(samples, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof AccountError ? error.message : 'Free practice could not load. Please try again.' }, { status: error instanceof AccountError ? error.status : 503, headers });
  }
});
