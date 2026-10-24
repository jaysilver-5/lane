// Rejection/preflight probes only: no credentials, signups, charges or grants.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), index = args.indexOf('--origin');
const origin = index >= 0 ? args[index + 1] : 'https://www.getfirstlane.com';
if (!origin || new URL(origin).origin !== origin || new URL(origin).protocol !== 'https:') throw new Error('Provide an exact HTTPS browser origin, without a path.');
const base = 'https://jinbdlckkyzffnocuugn.supabase.co/functions/v1/';
const checks = [
  ['clerk-account', 'OPTIONS', null, 204],
  ['clerk-account', 'POST', {}, 401],
  ['free-questions', 'POST', {}, 401],
  ['content-pack', 'OPTIONS', null, 200],
  ['content-pack', 'POST', { packKey: 'CA-ON-G1' }, 401],
  ['paddle-checkout', 'POST', {}, 401],
  ['delete-account', 'POST', null, 400],
  ['delete-account', 'POST', { confirmation: 'DELETE' }, 401],
  ['paddle-webhook', 'POST', {}, 401],
];
const results = await Promise.all(checks.map(async ([name, method, body, expected]) => {
  try {
    const response = await fetch(base + name, { method, headers: { Origin: origin, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    return { name, method, expected, status: response.status, passed: response.status === expected,
      allowOrigin: response.headers.get('access-control-allow-origin') };
  } catch (error) { return { name, method, expected, passed: false, error: error.message }; }
}));
const report = { checkedAt: new Date().toISOString(), project: 'jinbdlckkyzffnocuugn', origin,
  scope: 'Unauthenticated rejection and CORS preflight only; no customer-flow or payment acceptance implied.',
  mutationsAttempted: false, passed: results.every(row => row.passed), results };
const output = new URL('../qa/production-service-checks.json', import.meta.url);
mkdirSync(fileURLToPath(new URL('../qa/', import.meta.url)), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
