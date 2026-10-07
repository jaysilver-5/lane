import {createClient} from 'npm:@supabase/supabase-js@2';
// Configure the SAME Authorization header value in RevenueCat and RC_WEBHOOK_AUTH.
// This function uses a shared server secret, NOT a client bearer token.
async function same(a:string,b:string){const enc=new TextEncoder();const x=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(a))),y=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(b)));let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const expected=Deno.env.get('RC_WEBHOOK_AUTH'),url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),appIds=(Deno.env.get('RC_ALLOWED_APP_IDS')||'').split(',').filter(Boolean);
 if(!expected||!url||!key||!appIds.length)return new Response('Webhook configuration missing',{status:503});
 if(!await same(req.headers.get('authorization')||'',expected))return new Response('Unauthorized',{status:401});
 try{
  const raw=await req.text();if(raw.length>100000)return new Response('Too large',{status:413});
  const body=JSON.parse(raw),event=body.event;
  if(!event?.id||typeof event.id!=='string')return new Response('Missing event',{status:400});
  if(event.type==='TEST')return Response.json({test:true});
  if(!appIds.includes(event.app_id))return new Response('Wrong app',{status:403});
  const client=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await client.rpc('firstlane_apply_commerce_event',{p_event:event});
  if(error){console.error('commerce event failed',event.id,error.code);return new Response('Processing failed; retry required',{status:500});}
  // Commit BEFORE acknowledging. Returning 200 before a durable write would lose purchases.
  return Response.json(data);
 }catch{return new Response('Invalid event',{status:400});}
});
