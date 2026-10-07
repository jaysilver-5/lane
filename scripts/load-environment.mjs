import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
export function loadEnvironment(root) {
 const mode=process.env.NODE_ENV||'development';
 for(const name of [`.env.${mode}.local`,...(mode==='test'?[]:['.env.local']),`.env.${mode}`,'.env']) {
  const filename=path.join(root,name);if(!fs.existsSync(filename))continue;
  for(const [key,value] of Object.entries(parseEnv(fs.readFileSync(filename,'utf8'))))if(process.env[key]===undefined)process.env[key]=value;
 }
}
