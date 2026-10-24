import ts from 'typescript';
import { readdir, readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=new URL('../supabase/functions/',import.meta.url);
const folder=await mkdtemp(join(tmpdir(),'firstlane-edge-check-'));
let count=0;
try{
 for(const entry of await readdir(root,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.name==='_shared')continue;
  const source=await readFile(new URL(entry.name+'/index.ts',root),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const file=join(folder,entry.name+'.mjs');await writeFile(file,output);
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw new Error(entry.name+': '+result.stderr);
  count++;
 }
 console.log(`PASS: ${count} transpiled Edge Function entrypoints passed JavaScript module syntax checks.`);
}finally{
 const target=resolve(folder);
 if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith('firstlane-edge-check-'))throw new Error('Unexpected temporary cleanup path.');
 await rm(target,{recursive:true,force:true});
}
