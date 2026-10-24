import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { config } from '../config';
import { privateStorage } from './privateStorage';
import { assertClerkAccount, currentClerkSession, type ClerkSnapshot } from './clerkSession';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase=config.mode==='connected'&&url&&key ? createClient(url,key,{
 ...(Platform.OS==='web'?{accessToken:async()=>currentClerkSession()?.getToken()??null}:{}),
 auth:{storage:privateStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,flowType:'pkce'},
}) : null;
if(supabase && Platform.OS!=='web')AppState.addEventListener('change',state=>{if(state==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();});
export function requireSupabase(){if(!supabase)throw new Error('Account services are not connected yet. You can continue with guest practice.');return supabase;}
export function humanError(error:unknown){if(error instanceof Error)return error.message;if(error&&typeof error==='object'&&'message' in error&&typeof error.message==='string')return error.message;return 'Something did not finish. Please try again.';}

/** Pin a sensitive request to the session that initiated it, not whichever user signs in later. */
export async function authenticatedClient(expectedUserId?:string) {
 if(Platform.OS==='web'){
  const {snapshot,account}=assertClerkAccount(expectedUserId);
  const user=await bootstrapClerkAccount(snapshot);
  const current=assertClerkAccount(expectedUserId);
  if(user.id!==account.id||current.snapshot.sessionId!==snapshot.sessionId)throw new Error('Your account changed. Please try again.');
  const token=await snapshot.getToken();
  if(!token)throw new Error('Sign in to continue.');
  assertClerkAccount(user.id);
  const client=createClient(url!,key!,{accessToken:async()=>token,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  return {client,user};
 }
 const main=requireSupabase(),{data:{session},error}=await main.auth.getSession();
 if(error)throw error;
 if(!session||expectedUserId&&session.user.id!==expectedUserId)throw new Error('Your account changed. Please try again from the current account.');
 const token=session.access_token;
 const {data:{user},error:verificationError}=await main.auth.getUser(token);
 if(verificationError)throw verificationError;
 if(!user?.email_confirmed_at||user.id!==session.user.id)throw new Error('Verify your email to continue.');
 const client=createClient(url!,key!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return {client,user};
}

export async function bootstrapClerkAccount(snapshot:ClerkSnapshot){
 requireSupabase();
 const token=await snapshot.getToken();
 if(!token)throw new Error('Sign in to continue.');
 const response=await fetch(`${url}/functions/v1/clerk-account`,{method:'POST',headers:{apikey:key!,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(result?.error||'Your account could not be connected. Please try again.');
 if(!result?.id||result.confirmed!==true||typeof result.email!=='string')throw new Error('Verify your email to continue.');
 return {id:result.id as string,email:result.email as string,name:(result.name||'') as string,confirmed:true};
}
