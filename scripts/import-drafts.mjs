/** Trusted operator tool. Dry-run default. Never executed by the app. */
import {readFile} from 'node:fs/promises';
const bank=JSON.parse(await readFile(new URL('../content/ontario-g1.draft.json',import.meta.url),'utf8'));
if(!process.argv.includes('--execute')){console.log(`DRY RUN: ${bank.questions.length} private draft revisions. No approvals, releases or access grants. Pass --execute with DATABASE_URL in a trusted shell to import.`);process.exit(0);}
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL only in a trusted operator shell. Never EXPO_PUBLIC_DATABASE_URL.');
const {default:postgres}=await import('postgres');
const sql=postgres(process.env.DATABASE_URL,{max:1});
try{await sql.begin(async tx=>{for(const q of bank.questions){const old=await tx`select payload from firstlane_private.question_revisions where revision_id=${q.revision_id}`;if(old.length){if(JSON.stringify(old[0].payload)!==JSON.stringify(q)){
// PostgreSQL JSONB normalizes key order, so compare normalized recursive objects.
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
if(JSON.stringify(stable(old[0].payload))!==JSON.stringify(stable(q)))throw new Error('Changed payload under immutable revision '+q.revision_id);
}continue;}await tx`insert into firstlane_private.question_revisions (revision_id,question_id,pack_key,payload) values(${q.revision_id},${q.id},${q.pack_key},${tx.json(q)})`;}});console.log(`Imported ${bank.questions.length} private drafts; public releases: 0.`);}finally{await sql.end();}
