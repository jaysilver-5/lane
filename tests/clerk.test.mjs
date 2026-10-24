import test from 'node:test';
import assert from 'node:assert/strict';
import { clerkSettings, validateClerkClaims, verifyClerkToken, verifyClerkRequest } from '../supabase/functions/_shared/clerk.mjs';
const now=Date.now(), issuer='https://clerk.firstlane.test';
const settings={issuer,secret:'test-server-secret',parties:['http://127.0.0.1:4174']};
const claims={iss:issuer,sub:'user_A',sid:'sess_A',azp:settings.parties[0],iat:Math.floor(now/1000),exp:Math.floor(now/1000)+60,fva:[0,-1]};
const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key',alg:'RS256',use:'sig'};
async function signed(payload=claims,header={alg:'RS256',kid:'test-key'}){const data=`${encode(header)}.${encode(payload)}`;return `${data}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(data))).toString('base64url')}`;}
const jwks=async url=>{assert.equal(url,issuer+'/.well-known/jwks.json');return Response.json({keys:[jwk]});};
test('Clerk validates a real RSA signature against only the configured issuer',async()=>{const result=await verifyClerkToken(await signed(),settings,{fetcher:jwks,now});assert.equal(result.sub,'user_A');});
test('forged payload and unsigned token never authenticate',async()=>{
 const token=await signed(),parts=token.split('.');
 await assert.rejects(verifyClerkToken(`${parts[0]}.${encode({...claims,sub:'user_B'})}.${parts[2]}`,settings,{fetcher:jwks,now}));
 await assert.rejects(verifyClerkToken(`${encode({alg:'none',kid:'test-key'})}.${encode(claims)}.`,settings,{fetcher:jwks,now}));
});
test('wrong issuer, origin, pending, expired and malformed sessions are denied',()=>{
 for(const changes of [{iss:'https://evil.test'},{azp:'http://localhost:4174'},{exp:0},{nbf:claims.iat+120},{sid:'user_A'},{sts:'pending'},{exp:'forever'},{iat:claims.iat+120}])assert.throws(()=>validateClerkClaims({...claims,...changes},settings,now));
});
test('missing server configuration fails closed',()=>{assert.throws(()=>clerkSettings(()=>undefined),/not configured/);});
function api({verified=true,status='active',owner='user_A',banned=false}={}){
 return async(url,options)=>{
  if(url.startsWith(issuer))return jwks(url);
  assert.equal(options.headers.Authorization,'Bearer test-server-secret');
  if(url.endsWith('/sessions/sess_A'))return Response.json({status,user_id:owner});
  if(url.endsWith('/users/user_A'))return Response.json({id:'user_A',banned,primary_email_address_id:'email_1',email_addresses:[{id:'email_1',email_address:'learner@example.test',verification:{status:verified?'verified':'unverified'}}]});
  throw new Error('Unexpected endpoint');
 };
}
const env=name=>({CLERK_ISSUER_URL:issuer,CLERK_SECRET_KEY:settings.secret,CLERK_AUTHORIZED_PARTIES:settings.parties.join(',')}[name]);
test('API enforces current verified primary email, active session and subject ownership',async()=>{
 const token=await signed(),req=new Request('https://firstlane.test',{headers:{Authorization:`Bearer ${token}`}});
 const identity=await verifyClerkRequest(req,env,{fetcher:api()});assert.equal(identity.email,'learner@example.test');
 for(const options of [{verified:false},{status:'revoked'},{owner:'user_B'},{banned:true}])await assert.rejects(verifyClerkRequest(req,env,{fetcher:api(options)}));
});
