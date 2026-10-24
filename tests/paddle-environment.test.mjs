import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
import { assertPaddleTransaction, verifyPaddleSignature } from '../supabase/functions/_shared/paddle.mjs';

function compile(path) {
 return ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 }).outputText;
}

test('browser checkout requires an explicit environment matching its client token',async()=>{
 for(const [environment,token,expected] of [
  [undefined,'test_fixture',false],['','live_fixture',false],['production','live_fixture',false],
  ['sandbox','live_fixture',false],['live','test_fixture',false],
  ['sandbox','test_fixture',true],['live','live_fixture',true],
 ]){
  const exported={};let bindings=0;
  vm.runInNewContext(compile('../src/lib/paddle.ts'),{exports:exported,require:()=>({authenticatedClient:()=>{bindings++;}}),
   process:{env:{EXPO_PUBLIC_PADDLE_ENVIRONMENT:environment,EXPO_PUBLIC_PADDLE_CLIENT_TOKEN:token}},
  });
  assert.equal(exported.paddleConfigured(),expected);
  if(!expected){await assert.rejects(()=>exported.webPurchase('fixture'),/temporarily unavailable/);assert.equal(bindings,0);}
 }
});

async function webhook(environment, kind='firstlane') {
 let handler;const providerCalls=[],databaseCalls=[];
 const secret='synthetic-endpoint-secret',timestamp=Math.floor(Date.now()/1000);
 const event={event_id:'evt_'+'a'.repeat(26),event_type:'transaction.completed',occurred_at:new Date().toISOString(),data:{id:'txn_'+'b'.repeat(26)}};
 const raw=JSON.stringify(event);
 const offerPriceId='pri_'+'c'.repeat(26);
 const transaction={id:event.data.id,status:'completed',currency_code:'CAD',subscription_id:null,
  items:[{quantity:1,price:{id:offerPriceId,billing_cycle:null,trial_period:null,unit_price:{amount:'1499',currency_code:'CAD'}}}],
  custom_data:{user_id:'11111111-1111-4111-8111-111111111111',checkout_id:'22222222-2222-4222-8222-222222222222',pack_key:'CA-ON-G1'},
  created_at:event.occurred_at,
 };
 if(kind==='unrelated'){transaction.items[0].price.id='pri_'+'d'.repeat(26);transaction.custom_data={product:'tervlon'};}
 if(kind==='mixed')transaction.items.push({quantity:1,price:{...transaction.items[0].price,id:'pri_'+'d'.repeat(26)}});
 const imports={
  'npm:@supabase/supabase-js@2.117.2':{createClient:()=>({rpc:async(name,args)=>{databaseCalls.push({name,args});return {data:{applied:true},error:null};}})},
  '../_shared/paddle.mjs':{assertPaddleTransaction,verifyPaddleSignature,paddleRequest:async(path,env)=>{providerCalls.push({path,environment:env});return transaction;}},
 };
 const env={PADDLE_ENVIRONMENT:environment,PADDLE_API_KEY:'synthetic-key',PADDLE_PRICE_ID:offerPriceId,
  PADDLE_WEBHOOK_SECRET:secret,SUPABASE_URL:'https://production.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-role'};
 vm.runInNewContext(compile('../supabase/functions/paddle-webhook/index.ts'),{exports:{},require:name=>imports[name],
  Deno:{serve:fn=>{handler=fn;},env:{get:name=>env[name]}},Request,Response,console:{error(){}},
 });
 const signature=createHmac('sha256',secret).update(`${timestamp}:${raw}`).digest('hex');
 const response=await handler(new Request('https://production.invalid/functions/v1/paddle-webhook',{
  method:'POST',body:raw,headers:{'paddle-signature':`ts=${timestamp};h1=${signature}`},
 }));
 return {response,providerCalls,databaseCalls};
}

test('a signed webhook with missing or invalid environment cannot contact Paddle or grant access',async()=>{
 for(const environment of [undefined,null,'','production','LIVE']){
  const result=await webhook(environment);
  assert.equal(result.response.status,503);assert.equal(result.providerCalls.length,0);assert.equal(result.databaseCalls.length,0);
 }
});

test('a valid live signed webhook looks up and fulfills against the explicitly live environment',async()=>{
 const result=await webhook('live');
 assert.equal(result.response.status,200);
 assert.equal(result.providerCalls[0].environment,'live');
 assert.equal(result.databaseCalls[0].args.p_event.environment,'live');
});

test('a signed purchase of another product is acknowledged without touching FirstLane access',async()=>{
 const result=await webhook('live','unrelated');
 assert.equal(result.response.status,200);
 assert.deepEqual(await result.response.json(),{ignored:true,reason:'unrelated_product'});
 assert.equal(result.providerCalls.length,1);assert.equal(result.databaseCalls.length,0);
});

test('a mixed purchase containing FirstLane still requires review and cannot grant access',async()=>{
 const result=await webhook('live','mixed');
 assert.equal(result.response.status,500);assert.equal(result.databaseCalls.length,0);
});
