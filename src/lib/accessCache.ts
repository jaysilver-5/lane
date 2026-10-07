import { privateStorage } from './privateStorage';
const key=(userId:string)=>'firstlane-access-cache-v4:'+userId;
export const ACCESS_CACHE_MS=30*24*60*60*1000;
export async function cacheAccess(userId:string,records:any){
 if(!records?.serverNow||!Number.isFinite(Date.parse(records.serverNow)))return;
 await privateStorage.setItem(key(userId),JSON.stringify({userId,records,localAt:Date.now()}));
}
export async function cachedAccess(userId:string){
 const raw=await privateStorage.getItem(key(userId));if(!raw)return null;
 try{const entry=JSON.parse(raw),elapsed=Date.now()-entry.localAt,checked=Date.parse(entry.records?.serverNow);
 if(entry.userId!==userId||!Number.isFinite(elapsed)||elapsed<0||elapsed>=ACCESS_CACHE_MS||!Number.isFinite(checked))return null;
 return {...entry.records,cached:true,offlineUntil:new Date(checked+ACCESS_CACHE_MS).toISOString(),serverNow:new Date(checked+elapsed).toISOString()};
 }catch{return null;}
}
export async function removeAccessCache(userId:string){await privateStorage.removeItem(key(userId));}
export function permitsOfflineFallback(error:unknown){
 const e=error as {status?:number;message?:string;name?:string};
 if(e?.status===401||e?.status===403)return false;
 return (typeof e?.status==='number'&&e.status>=500)||e?.name==='AuthRetryableFetchError'||/network|fetch failed|failed to fetch|offline|timed? ?out|connection/i.test(e?.message||'');
}
