// Developer review manifest ONLY. Never promotes authoring drafts into approved material.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {validateBank} from '../src/domain/engine.mjs';
const raw=await readFile(new URL('../content/ontario-g1.draft.json',import.meta.url));const bank=JSON.parse(raw);const errors=validateBank(bank);if(errors.length)throw new Error(errors.join('\n'));
const manifest={pack_key:'CA-ON-G1',version:'0.1.0',visibility:'internal-review-only',publishable:false,questions:bank.questions.length,sha256:createHash('sha256').update(raw).digest('hex'),note:'Hash checks file integrity; it is not a signature, approval or entitlement.'};
await writeFile(new URL('../content/internal-review-manifest.json',import.meta.url),JSON.stringify(manifest,null,2));console.log('Internal review manifest prepared. No public release generated.');
