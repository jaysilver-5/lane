import { createClient } from 'npm:@supabase/supabase-js@2';
const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req => {
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return json({error:'Content service is unavailable'},503);
 if(!token)return json({error:'Sign in to download your pack'},401);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await admin.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return json({error:'A verified account is required'},401);
 try {
   const raw=await req.text();if(raw.length>1024)return json({error:'Request too large'},413);
   const input=JSON.parse(raw);if(input.packKey!=='CA-ON-G1')return json({error:'Unknown pack'},400);
   // The authenticated RPC checks both purchase ownership and approved publication status.
   const caller=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:release,error}=await caller.rpc('firstlane_content_release',{p_pack_key:input.packKey});
   if(error)return json({error:'Ontario G1 Complete access is required'},403);
   if(!release)return json({error:'The approved study pack is not available yet'},503);
   const {data:signed,error:storageError}=await admin.storage.from('content-releases').createSignedUrl(release.storage_path,120);
   if(storageError||!signed)return json({error:'The download could not be prepared'},503);
   return json({url:signed.signedUrl,version:release.version,sha256:release.sha256,bytes:release.bytes,questionCount:release.question_count});
 } catch {return json({error:'Invalid content request'},400);}
});
