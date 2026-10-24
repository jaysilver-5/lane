import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPaddleSignature, assertPaddlePrice, assertPaddleTransaction, paddleApi, paddleRequest } from '../supabase/functions/_shared/paddle.mjs';
const price = { id: 'pri_'+'a'.repeat(26), status: 'active', billing_cycle: null, trial_period: null, unit_price: { amount: '1499', currency_code: 'CAD' } };
const transaction = () => ({ id: 'txn_'+'b'.repeat(26), status: 'completed', currency_code: 'CAD', items: [{ price: structuredClone(price), quantity: 1 }], subscription_id: null, custom_data: { user_id: '11111111-1111-4111-8111-111111111111', checkout_id: '22222222-2222-4222-8222-222222222222', pack_key: 'CA-ON-G1' } });
const now = Date.now(), ts = Math.floor(now/1000), raw = '{"event_id":"fixture","data":{}}', secret = 'test-endpoint-secret';
const signature = body => createHmac('sha256',secret).update(`${ts}:${body}`).digest('hex');
test('Paddle verifies exact raw bytes and supports signature rotation', async()=>{
  assert.equal(await verifyPaddleSignature(raw,`ts=${ts};h1=${'0'.repeat(64)};h1=${signature(raw)}`,secret,now),true);
  assert.equal(await verifyPaddleSignature(raw+' ',`ts=${ts};h1=${signature(raw)}`,secret,now),false);
  assert.equal(await verifyPaddleSignature(raw,`ts=${ts};h1=${signature(raw)}`,'other-secret',now),false);
});
test('Paddle rejects stale, future, missing and malformed signatures',async()=>{
  for(const header of [null,'',`ts=bad;h1=${signature(raw)}`,`ts=${ts};h1=bad`]) assert.equal(await verifyPaddleSignature(raw,header,secret,now),false);
  for(const clock of [now+301000,now-301000]) assert.equal(await verifyPaddleSignature(raw,`ts=${ts};h1=${signature(raw)}`,secret,clock),false);
});
test('Paddle only permits the CA$14.99 one-time offer',()=>{
  assert.doesNotThrow(()=>assertPaddlePrice(price));
  for(const change of [{billing_cycle:{interval:'month'}},{trial_period:{interval:'day'}},{status:'archived'},{unit_price:{amount:'1499',currency_code:'USD'}},{unit_price:{amount:'1999',currency_code:'CAD'}}]) assert.throws(()=>assertPaddlePrice({...price,...change}));
});
test('Paddle validates transaction owner metadata and blocks altered offers',()=>{
  assert.doesNotThrow(()=>assertPaddleTransaction(transaction(),price.id,true));
  for(const change of [{currency_code:'USD'},{status:'paid'},{subscription_id:'sub_fixture'},{discount_id:'dsc_fixture'},{custom_data:{user_id:'client-selected'}},{items:[]}]) assert.throws(()=>assertPaddleTransaction({...transaction(),...change},price.id,true));
  const tx=transaction();tx.items[0].quantity=2;assert.throws(()=>assertPaddleTransaction(tx,price.id,true));
  assert.throws(()=>assertPaddleTransaction(transaction(),'pri_wrong',true));
});
test('archiving a historical price does not prevent refunds or fulfillment',()=>{
  const tx=transaction();tx.items[0].price.status='archived';assert.doesNotThrow(()=>assertPaddleTransaction(tx,price.id,true));
});

test('the fixed CAD1499 offer permits tax on top and keeps historical tax-inclusive purchases valid',()=>{
 for(const [tax_mode,subtotal,tax,total] of [['external','1499','195','1694'],['internal','1327','172','1499']]){
  const tx=transaction();tx.items[0].price.tax_mode=tax_mode;
  tx.details={totals:{subtotal,tax,total,discount:'0'}};
  assert.doesNotThrow(()=>assertPaddleTransaction(tx,price.id,true));
 }
});
test('sandbox and live Paddle API accounts cannot be mixed implicitly',()=>{
  assert.equal(paddleApi('sandbox'),'https://sandbox-api.paddle.com');assert.equal(paddleApi('live'),'https://api.paddle.com');assert.throws(()=>paddleApi('production'));
});

test('Paddle request errors retain a safe status/code without leaking the provider response', async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'forbidden',detail:'private-provider-detail'},secret:'private-value'}),{status:403});
    await assert.rejects(()=>paddleRequest('/prices/fixture','sandbox','synthetic-key'),error=>{
      assert.equal(error.status,403);assert.equal(error.paddleCode,'forbidden');
      assert.doesNotMatch(JSON.stringify(error),/private|synthetic-key/);return true;
    });
    globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'secret-data-with-invalid-characters!'}}),{status:401});
    await assert.rejects(()=>paddleRequest('/prices/fixture','sandbox','synthetic-key'),error=>{assert.equal(error.paddleCode,undefined);return true;});
  } finally {globalThis.fetch=original;}
});
