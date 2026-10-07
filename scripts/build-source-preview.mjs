/** Source-rendered design companion. This is a DOM adapter, NOT React Native/Expo QA. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);let ts;
try {ts=require('typescript');} catch {ts=require(process.env.TYPESCRIPT_PATH || 'typescript');}
const root=fileURLToPath(new URL('..',import.meta.url));
const modules={};
for(const folder of ['app','src/components','src/domain','src/theme','src/data']) {
 function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(/\.(?:tsx?|mjs|json)$/.test(p)){
  const id='/'+path.relative(root,p).replaceAll('\\','/');const text=fs.readFileSync(p,'utf8');
  if(p.endsWith('.json')) modules[id]='module.exports='+text;
  else modules[id]=ts.transpileModule(text,{fileName:p.endsWith('.mjs')?p.replace(/\.mjs$/,'.ts'):p,compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 }} }walk(path.join(root,folder));
}
modules['/content/sample-manifest.json']='module.exports='+fs.readFileSync(path.join(root,'content/sample-manifest.json'),'utf8');
const logo='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/firstlane-mark.png')).toString('base64');
const template=fs.readFileSync(path.join(root,'preview/source-template.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'preview/source-runtime.js'),'utf8');
const html=template.replace('/*__MODULES__*/','const MODULES='+JSON.stringify(modules).replaceAll('</','<\\/')+';const LOGO='+JSON.stringify(logo)+';').replace('/*__RUNTIME__*/',runtime);
fs.writeFileSync(path.join(root,'preview/index.html'),html);
console.log('Built source-rendered visual companion. Not a native or Expo runtime; '+Object.keys(modules).length+' source modules.');
