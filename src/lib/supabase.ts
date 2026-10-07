import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { config } from '../config';
import { privateStorage } from './privateStorage';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase=config.mode==='connected'&&url&&key ? createClient(url,key,{
 auth:{storage:privateStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,flowType:'pkce'},
}) : null;
if(supabase && Platform.OS!=='web')AppState.addEventListener('change',state=>{if(state==='active')supabase.auth.startAutoRefresh();else supabase.auth.stopAutoRefresh();});
export function requireSupabase(){if(!supabase)throw new Error('Account services are temporarily unavailable. Please try again later.');return supabase;}
export function humanError(error:unknown){if(error instanceof Error)return error.message;if(error&&typeof error==='object'&&'message' in error&&typeof error.message==='string')return error.message;return 'Something did not finish. Please try again.';}

/** Pin a sensitive request to the session that initiated it, not whichever user signs in later. */
export async function authenticatedClient(expectedUserId?:string) {
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
