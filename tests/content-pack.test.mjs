import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

async function request({token='test-token',invalid=false,denied=false,release=null}={}){
 let handler,signed=0;class AccountError extends Error{constructor(message,status=401){super(message);this.status=status;}}
 const imports={'npm:@supabase/supabase-js@2.117.2':{createClient:()=>({rpc:async()=>({data:release,error:denied?Error('Denied'):null}),storage:{from:()=>({createSignedUrl:async()=>{signed++;return{data:{signedUrl:'https://storage.example/approved'}};}})}})},'../_shared/clerk.mjs':{AccountError,verifyClerkRequest:async()=>{if(invalid)throw new AccountError('Invalid session');return{};},bindClerkAccount:async()=>({id:'A'})}};
 const source=fs.readFileSync(new URL('../supabase/functions/content-pack/index.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports:{},require:name=>imports[name],Deno:{env:{get:()=> 'fixture'},serve:fn=>{handler=fn;}},Request,Response});
 const response=await handler(new Request('https://example/content-pack',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify({packKey:'CA-ON-G1'})}));return{status:response.status,body:await response.json(),signed};
}
test('unpublished content is identified only after verified identity and paid-access checks',async()=>{
 for(const opts of[{token:null},{invalid:true},{denied:true}]){const r=await request(opts);assert.ok([401,403].includes(r.status));assert.equal(r.body.code,undefined);assert.equal(r.signed,0);}
 const r=await request();assert.equal(r.status,409);assert.equal(r.body.code,'content_not_published');assert.equal(r.signed,0);
});
test('an authorized published release retains signed private delivery',async()=>{
 const r=await request({release:{storage_path:'approved/v1.json',version:'1',sha256:'a'.repeat(64),bytes:1234,question_count:500}});assert.equal(r.status,200);assert.equal(r.body.questionCount,500);assert.equal(r.signed,1);assert.equal(r.body.code,undefined);
});
