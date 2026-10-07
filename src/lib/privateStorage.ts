import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
// Keychain/Keystore values are chunked to avoid a token exceeding per-item size limits.
// A generation pointer is committed last. Old working values survive a failed write.
interface Index { generation: string; count: number; }
const safe = (key: string) => 'firstlane.private.' + key.replace(/[^a-zA-Z0-9._-]/g, '_');
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const queue = new Map<string, Promise<unknown>>();
function serial<T>(key:string, operation:()=>Promise<T>):Promise<T> {
    const task=(queue.get(key)||Promise.resolve()).catch(()=>{}).then(operation);
    queue.set(key,task);
    void task.finally(()=>{if(queue.get(key)===task)queue.delete(key);}).catch(()=>{});
    return task;
}
function chunks(value:string) { const output:string[]=[]; let part='',bytes=0; for(const c of value){const size=new TextEncoder().encode(c).length;if(bytes+size>1500){output.push(part);part='';bytes=0;}part+=c;bytes+=size;}if(part||!output.length)output.push(part);return output; }
async function index(key:string):Promise<Index|null>{const raw=await SecureStore.getItemAsync(safe(key),options);if(!raw)return null;const x:Index=JSON.parse(raw);if(typeof x.generation!=='string'||!Number.isInteger(x.count)||x.count<1||x.count>100)throw new Error('Invalid private storage record.');return x;}
async function removeChunks(key:string,x:Index|null){if(!x)return;await Promise.all(Array.from({length:x.count},(_,i)=>SecureStore.deleteItemAsync(`${safe(key)}.${x.generation}.${i}`,options)));}
export const privateStorage={
 getItem(key:string):Promise<string|null>{return serial(key,async()=>{
   if(Platform.OS==='web')return AsyncStorage.getItem(key);
   const x=await index(key);
   if(!x)return null;
   const values=await Promise.all(Array.from({length:x.count},(_,i)=>SecureStore.getItemAsync(`${safe(key)}.${x.generation}.${i}`,options)));
   if(values.some(v=>v===null))throw new Error('Private device storage is incomplete. Please sign in again.');
   return values.join('');
 });},
 setItem(key:string,value:string):Promise<void>{return serial(key,async()=>{
   if(Platform.OS==='web'){await AsyncStorage.setItem(key,value);return;}
   const old=await index(key),parts=chunks(value),next={generation:Crypto.randomUUID(),count:parts.length};
   if(parts.length>100)throw new Error('Private storage value is too large.');
   try {for(let i=0;i<parts.length;i++)await SecureStore.setItemAsync(`${safe(key)}.${next.generation}.${i}`,parts[i]!,options);await SecureStore.setItemAsync(safe(key),JSON.stringify(next),options);}
   catch(error){await removeChunks(key,next).catch(()=>{});throw error;}
   await removeChunks(key,old).catch(()=>{});
   await AsyncStorage.removeItem(key).catch(()=>{}); // remove any legacy plaintext session after the secure write
 });},
 removeItem(key:string):Promise<void>{return serial(key,async()=>{
   if(Platform.OS==='web'){await AsyncStorage.removeItem(key);return;}
   const old=await index(key);await SecureStore.deleteItemAsync(safe(key),options);await removeChunks(key,old);await AsyncStorage.removeItem(key).catch(()=>{});
 });},
};
