import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { assertPaddlePrice, assertPaddleTransaction } from '../supabase/functions/_shared/paddle.mjs';

const user='11111111-1111-4111-8111-111111111111', checkout='22222222-2222-4222-8222-222222222222';
const price={id:'pri_'+'a'.repeat(26),status:'active',billing_cycle:null,trial_period:null,tax_mode:'external',unit_price:{amount:'1499',currency_code:'CAD'}};
const transaction=(status='ready',tax_mode='internal')=>({id:'txn_'+'b'.repeat(26),status,currency_code:'CAD',items:[{price:{...structuredClone(price),tax_mode},quantity:1}],subscription_id:null,custom_data:{user_id:user,checkout_id:checkout,pack_key:'CA-ON-G1'}});
async function invoke({status='ready',taxMode='internal',catalogMode='external',owner=user,fresh=false,cancelError=false,canceledStatus='canceled',environment='sandbox'}={}){
 let handler,bindings=0;const calls=[],rpcs=[];
 const db={rpc:async(name,args)=>{rpcs.push({name,args});return {data:name==='firstlane_paddle_reserve'?{id:checkout,status:'ready',fresh,transaction_id:fresh?undefined:transaction().id}:null,error:null};}};
 class AccountError extends Error {}
 const imports={
  'npm:@supabase/supabase-js@2.117.2':{createClient:()=>db},
  '../_shared/clerk.mjs':{AccountError,verifyClerkRequest:async()=>({}),bindClerkAccount:async()=>{bindings++;return {id:user};}},
  '../_shared/paddle.mjs':{assertPaddlePrice,assertPaddleTransaction,paddleRequest:async(path,environment,key,options={})=>{
   calls.push({path,method:options.method||'GET',body:options.body&&JSON.parse(options.body)});
   assert.ok(['sandbox','live'].includes(environment));
   if(path.startsWith('/prices/'))return {...structuredClone(price),tax_mode:catalogMode};
   if(options.method==='PATCH'){
    if(cancelError)throw new Error('Synthetic upstream error');
    return transaction(canceledStatus,taxMode);
   }
   if(options.method==='POST')return transaction('draft','external');
   const tx=transaction(status,taxMode);tx.custom_data.user_id=owner;return tx;
  }},
 };
 const source=fs.readFileSync(new URL('../supabase/functions/paddle-checkout/index.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const env={WEB_APP_ORIGIN:'http://127.0.0.1:4174',SUPABASE_URL:'https://sandbox.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic',PADDLE_API_KEY:'synthetic',PADDLE_PRICE_ID:price.id,PADDLE_ENVIRONMENT:environment};
 vm.runInNewContext(js,{exports:{},require:name=>imports[name],Deno:{serve:fn=>{handler=fn;},env:{get:name=>env[name]}},Request,Response,console:{error(){}}});
 const response=await handler(new Request('https://sandbox.invalid/functions/v1/paddle-checkout',{method:'POST',headers:{Origin:env.WEB_APP_ORIGIN}}));
 return {status:response.status,body:await response.json(),calls,rpcs,bindings};
}
test('a stale inclusive quote is confirmed canceled before a new payable quote can be created',async()=>{
 const result=await invoke();assert.equal(result.status,409);assert.equal(result.body.transactionId,undefined);
 const patch=result.calls.find(c=>c.method==='PATCH');assert.deepEqual(patch.body,{status:'canceled'});
 assert.equal(patch.path,'/transactions/'+transaction().id);assert.equal(result.calls.some(c=>c.method==='POST'),false);
 assert.equal(result.rpcs.at(-1).args.p_status,'canceled');
 const next=await invoke({fresh:true});assert.equal(next.status,200);assert.equal(next.calls.filter(c=>c.method==='POST').length,1);
});
test('current exclusive quotes do not make an unnecessary provider mutation',async()=>{
 const result=await invoke({taxMode:'external'});assert.equal(result.status,200);assert.equal(result.calls.some(c=>c.method!=='GET'),false);
});
test('paid, completed, billed and past-due transactions are never repriced or reopened for a second charge',async()=>{
 for(const status of ['paid','completed','billed','past_due']){const result=await invoke({status});assert.equal(result.body.status,'pending');assert.equal(result.calls.some(c=>c.method!=='GET'),false);}
});
test('another account cannot trigger repricing or attachment',async()=>{
 const result=await invoke({owner:'33333333-3333-4333-8333-333333333333'});assert.equal(result.status,503);
 assert.equal(result.calls.some(c=>c.method!=='GET'),false);assert.equal(result.rpcs.some(c=>c.name==='firstlane_paddle_attach'),false);
});
test('new checkout creation requires the explicitly exclusive CAD1499 catalog offer',async()=>{
 const rejected=await invoke({catalogMode:'internal',fresh:true});assert.equal(rejected.status,503);assert.equal(rejected.rpcs.length,0);
 const result=await invoke({fresh:true});assert.equal(result.status,200);assert.equal(result.calls.filter(c=>c.method==='POST').length,1);
});
test('failed or unconfirmed cancellation never releases the reservation or creates another transaction',async()=>{
 for(const options of [{cancelError:true},{canceledStatus:'ready'}]){const result=await invoke(options);assert.equal(result.status,503);assert.equal(result.body.transactionId,undefined);assert.equal(result.calls.some(c=>c.method==='POST'),false);assert.equal(result.rpcs.some(c=>c.name==='firstlane_paddle_attach'),false);}
});
test('payment completing during cancellation cannot release the reservation or create a new charge',async()=>{
 const result=await invoke({canceledStatus:'completed'});assert.equal(result.status,503);assert.equal(result.body.transactionId,undefined);
 assert.equal(result.rpcs.some(c=>c.name==='firstlane_paddle_attach'),false);assert.equal(result.calls.some(c=>c.method==='POST'),false);
});

test('checkout fails before account binding or provider requests when its environment is missing or invalid',async()=>{
 for(const environment of [undefined,null,'','production','LIVE']){
  // Explicit undefined must override the helper's sandbox default.
  const result=await invoke({environment:environment===undefined?null:environment,fresh:true});
  assert.equal(result.status,503);assert.equal(result.calls.length,0);assert.equal(result.rpcs.length,0);assert.equal(result.bindings,0);
 }
});

test('an explicitly live checkout retains the live environment in its reservation and response',async()=>{
 const result=await invoke({environment:'live',fresh:true});
 assert.equal(result.status,200);assert.equal(result.body.environment,'live');
 assert.equal(result.rpcs.find(c=>c.name==='firstlane_paddle_reserve').args.p_environment,'live');
});
