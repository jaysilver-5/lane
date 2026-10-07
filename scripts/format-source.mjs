// Uses the project's TypeScript printer; formats only source, not bank or SVG payloads.
import {createRequire} from 'node:module';import {readdir,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript');}catch{ts=require(process.env.TYPESCRIPT_PATH);}
const root=fileURLToPath(new URL('..',import.meta.url)),printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory()){await walk(p);continue;}if(!/\.tsx?$/.test(p)||f.name==='art.ts')continue;const text=await readFile(p,'utf8');await writeFile(p,printer.printFile(ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)));}}
await walk(path.join(root,'app'));await walk(path.join(root,'src'));
