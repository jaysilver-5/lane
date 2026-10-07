import fs from 'node:fs';
import { loadEnvironment } from './load-environment.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { validateQuestionPayload } from '../src/domain/content.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { contentIssues, releasePath } = require('./release-policy.cjs');
loadEnvironment(root);
const mode = process.env.EXPO_PUBLIC_APP_MODE || 'connected';
const exists = fs.existsSync(path.join(root, releasePath));
const source = path.join(root, exists && mode !== 'demo' ? releasePath : 'content/ontario-g1.draft.json');
const raw = fs.readFileSync(source), bank = JSON.parse(raw);
const approved = exists && mode !== 'demo';
if (approved) { const errors = contentIssues(bank, root); if (errors.length) throw new Error(errors.join('\n')); }
if (mode === 'production' && !approved) throw new Error('No approved release exists. Do not ship the authoring draft.');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'content/sample-manifest.json')));
const selected = mode === 'demo' ? bank.questions : bank.questions.filter(q => manifest.freeQuestionIds.includes(q.id));
if (mode !== 'demo' && selected.length !== 40) throw new Error('All 40 fixed sample IDs must exist in the release.');
const payload = { packKey: 'CA-ON-G1', version: bank.version || '0.1.0', approved, sourceSha256: createHash('sha256').update(raw).digest('hex'), questions: selected, sources: bank.sources,
 topics: [...new Set(bank.questions.map(q=>q.topic))].map((title,i)=>({ id:String(i),title,count:bank.questions.filter(q=>q.topic===title).length,section:bank.questions.find(q=>q.topic===title).section })) };
const errors = validateQuestionPayload(payload, { approved }); if (errors.length) throw new Error(errors.join('\n'));
fs.writeFileSync(path.join(root,'src/data/generated-bank.json'), JSON.stringify(payload));
console.log(`Client bank: ${selected.length} questions; ${approved ? 'approved' : 'internal testing only'}. No approval state was changed.`);
if (approved) {
  const full = { packKey: payload.packKey, version: payload.version, approved: true, questions: bank.questions };
  const serialized = JSON.stringify(full), sha256 = createHash('sha256').update(serialized).digest('hex');
  fs.mkdirSync(path.join(root,'release-artifacts'), {recursive:true});
  fs.writeFileSync(path.join(root,'release-artifacts/ontario-g1.json'), serialized);
  fs.writeFileSync(path.join(root,'release-artifacts/manifest.json'), JSON.stringify({packKey:full.packKey, version:full.version, sha256, questionCount:full.questions.length, bytes:Buffer.byteLength(serialized)},null,2));
  console.log('Protected full release generated in release-artifacts/. Upload only to the private content-releases bucket.');
}
