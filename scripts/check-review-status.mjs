import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewStatus } from './review-status.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/check-review-status.mjs [--out report.json] [review-export.json ...]\nChecks exact decisions against the current draft. Publishes nothing; exits 1 while reviews or release-wide checks are incomplete.');
} else {
  let out;
  const index = args.indexOf('--out');
  if (index >= 0) { out = args[index + 1]; if (!out || out.startsWith('--')) throw new Error('Provide a report output path.'); args.splice(index, 2); }
  if (args.some(arg => arg.startsWith('--'))) throw new Error('Unknown option. Use --help.');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const raw = readFileSync(resolve(root, 'content/ontario-g1.draft.json'), 'utf8');
  const report = reviewStatus(raw, args.map(name => ({ name, value: JSON.parse(readFileSync(name, 'utf8')) })));
  if (out) {
    const target = resolve(out);
    if (dirname(target) !== resolve(root, 'content/review') || !/^status-[a-z0-9-]+\.json$/.test(basename(target))) throw new Error('Write status reports only as content/review/status-<name>.json; never overwrite question content, review exports or releases.');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ questionCount: report.questionCount, counts: report.counts, validationErrors: report.validationErrors,
    releaseWide: report.releaseWide, readyForReleaseAssembly: report.readyForReleaseAssembly, publicationRequested: false }, null, 2));
  if (!report.readyForReleaseAssembly || !Object.values(report.releaseWide).every(Boolean)) process.exitCode = 1;
}
