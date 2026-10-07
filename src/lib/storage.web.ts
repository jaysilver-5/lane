import type { LearnerState } from '../domain/types';
import type { ContentPack } from './content';
const prefix = 'firstlane-v1:';
let legacyPurged=false;
function purgeLegacy(){if(!legacyPurged&&typeof window!=='undefined'){window.localStorage.removeItem(prefix+'pack:CA-ON-G1');legacyPurged=true;}}
function read(key:string) { purgeLegacy(); return typeof window === 'undefined' ? null : window.localStorage.getItem(prefix+key); }
function write(key:string,value:string) { if(typeof window === 'undefined') throw new Error('Device storage is unavailable.'); window.localStorage.setItem(prefix+key,value); }
function remove(key:string) { if(typeof window !== 'undefined') window.localStorage.removeItem(prefix+key); }
const packKey=(owner:string,key:string)=>'owned-pack:'+owner+':'+key;
export const storage = {
 async load(owner:string):Promise<LearnerState|null>{const raw=read('learner:'+owner);return raw?JSON.parse(raw):null;},
 async save(owner:string,state:LearnerState){write('learner:'+owner,JSON.stringify(state));},
 async remove(owner:string){remove('learner:'+owner);},
 async loadPack(owner:string,key:string):Promise<ContentPack|null>{const raw=read(packKey(owner,key));return raw?JSON.parse(raw):null;},
 async installPack(owner:string,pack:ContentPack){const key=packKey(owner,pack.packKey),old=read(key);if(old)write('rollback:'+key,old);write(key,JSON.stringify(pack));},
 async rollbackPack(owner:string,key:string){const k=packKey(owner,key),old=read('rollback:'+k);if(old)write(k,old);remove('rollback:'+k);},
 async removePack(owner:string,key:string){const k=packKey(owner,key);remove(k);remove('rollback:'+k);},
};
