import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState as NativeAppState, Platform, useColorScheme } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { defaults, type LearnerState, type Preferences, type StudyMode, type Answer } from '../domain/types';
import { questions, questionMap, replaceQuestionBank, bundledContent } from '../data/bank';
import { activity, checkAnswer, latestMistakes, selectQuestions } from '../domain/engine.mjs';
import { mergeProgress, normaliseState } from '../domain/progress.mjs';
import { validateQuestionPayload } from '../domain/content.mjs';
import { storage } from '../lib/storage';
import { supabase, humanError, authenticatedClient } from '../lib/supabase';
import { palette, type Colors } from '../theme/tokens';
import { config } from '../config';
import { setDailyReminder } from '../lib/reminders';
import { resolveAccess, allowedQuestions, canReadQuestion, canUseFeature } from '../domain/access.mjs';
import sampleManifest from '../../content/sample-manifest.json';
import { parkIncompatibleSession, recoverCompatibleSession } from '../domain/availability.mjs';
import { demoSession, demoRecords, demoPurchase, demoLogout, type Identity } from '../lib/demoAccount';
import { readAccess, clearPendingPurchase, storeClient } from '../lib/billing';
import { cacheAccess, cachedAccess, removeAccessCache, permitsOfflineFallback } from '../lib/accessCache';
import { downloadContentPack, type ContentPack } from '../lib/content';
import { syncProgress } from '../lib/sync';
interface Store {
 identity: Identity|null; access: ReturnType<typeof resolveAccess>; accessRecords:any; accessLoading:boolean;
 accessGate:string|null; setAccessGate:(reason:string|null)=>void; canRead:(id:string)=>boolean;
 refreshIdentity:()=>Promise<void>; reloadAccess:(forceOnline?:boolean)=>Promise<any>; purchaseDemo:()=>Promise<void>; parkPremiumSession:()=>void;
 state:LearnerState; ready:boolean; colors:Colors; dark:boolean; reduceMotion:boolean; auth:Session|null;
 toast:string; notify:(message:string)=>void; patchPreferences:(p:Partial<Preferences>)=>void;
 begin:(mode:StudyMode,topic?:string)=>boolean; answer:(optionId:string)=>void; advance:()=>boolean; toggleBookmark:(id:string)=>void;
 installPack:()=>Promise<void>; removePack:()=>Promise<void>; bankLoading:boolean; bankVersion:string;
 resetProgress:()=>Promise<void>; clearAccountData:()=>Promise<void>; setReminders:(enabled:boolean,hour?:number)=>Promise<void>;
 finishOnboarding:()=>void; signOut:()=>Promise<void>; sync:()=>Promise<void>; report:(message:string,questionId?:string)=>Promise<boolean>;
 enableDemo:()=>void; syncStatus:'local'|'syncing'|'synced'|'error'; owner:string;
}
const Context=createContext<Store|null>(null);
const fresh=()=>normaliseState(null,defaults) as LearnerState;
export function AppProvider({children}:{children:React.ReactNode}) {
 const [state,setState]=useState<LearnerState>(fresh),[loadedOwner,setLoadedOwner]=useState<string|null>(null);
 const [auth,setAuth]=useState<Session|null>(null),[authReady,setAuthReady]=useState(false),[demoIdentity,setDemoIdentity]=useState<Identity|null>(null);
 const identity=useMemo<Identity|null>(()=>config.mode==='demo'?demoIdentity:auth?{id:auth.user.id,email:auth.user.email||'',name:auth.user.user_metadata?.display_name||'',confirmed:!!auth.user.email_confirmed_at}:null,[auth,demoIdentity]);
 const owner=identity?.id||'guest',ownerRef=useRef(owner);ownerRef.current=owner;
 const [snapshot,setSnapshot]=useState<{owner:string;records:any}>({owner:'guest',records:{}}),[accessLoading,setAccessLoading]=useState(false);
 const [accessGate,setAccessGate]=useState<string|null>(null),[clock,setClock]=useState(Date.now()),[serverOffset,setServerOffset]=useState(0);
 const accessRecords=snapshot.owner===owner?snapshot.records:{};
 const access=resolveAccess(identity,accessRecords,clock+serverOffset);
 const fullAccessRef=useRef(access.full);fullAccessRef.current=access.full;
 const packEpoch=useRef(0);
 const canRead=(id:string)=>questionMap.has(id)&&canReadQuestion(id,access,sampleManifest);
 const [toast,setToast]=useState(''),[osReduce,setOsReduce]=useState(false),[syncStatus,setSyncStatus]=useState<Store['syncStatus']>('local');
 const [bankLoading,setBankLoading]=useState(false),[bankVersion,setBankVersion]=useState(bundledContent.version),[bankRevision,setBankRevision]=useState(0);
 const system=useColorScheme(),alive=useRef(true),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const blockedOwners=useRef(new Set<string>()),stateRef=useRef(state);stateRef.current=state;
 const writeQueue=useRef<Promise<unknown>>(Promise.resolve()),accessSequence=useRef(0),downloadJobs=useRef(new Map<string,Promise<void>>());
 const notify=useCallback((message:string)=>{if(!alive.current)return;setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>{if(alive.current)setToast('');},5000);},[]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(toastTimer.current)clearTimeout(toastTimer.current);};},[]);
 useEffect(()=>{AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(alive.current)setOsReduce(v);}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setOsReduce);return()=>sub.remove();},[]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30_000);return()=>clearInterval(timer);},[]);
 const refreshIdentity=useCallback(async()=>{if(config.mode==='demo'){const next=await demoSession();if(alive.current)setDemoIdentity(next);}},[]);
 useEffect(()=>{
  let active=true,authEvents=0;
  if(config.mode==='demo'){refreshIdentity().catch(()=>notify('Your test account could not be restored.')).finally(()=>{if(active)setAuthReady(true);});return()=>{active=false;};}
  if(!supabase){setAuthReady(true);return;}
  // Do not await other Supabase operations inside onAuthStateChange.
  const bootstrapTimer=setTimeout(()=>{if(active){setAuthReady(true);}},10_000);
  const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{authEvents++;if(active){setAuth(session);setAuthReady(true);}});
  supabase.auth.getSession().then(({data,error})=>{if(active&&authEvents===0){if(error)notify('Please sign in again to restore your account.');setAuth(data.session);setAuthReady(true);}}).catch(()=>{if(active){setAuthReady(true);notify('Account access could not be restored. Your local progress is safe.');}});
  return()=>{active=false;clearTimeout(bootstrapTimer);listener.subscription.unsubscribe();};
 },[refreshIdentity,notify]);
 const reloadAccess=useCallback(async(forceOnline=false)=>{
  const id=identity?.id,seq=++accessSequence.current;
  if(!id||!identity?.confirmed){setSnapshot({owner:ownerRef.current,records:{}});return {};}
  setAccessLoading(true);
  try {
   let records:any;
   if(config.mode==='demo')records=await demoRecords(identity);
   else {
    try{records=await readAccess(id);await cacheAccess(id,records).catch(()=>{});}
    catch(error){if(forceOnline||!permitsOfflineFallback(error))throw error;records=await cachedAccess(id);if(!records)throw error;}
   }
   if(alive.current&&ownerRef.current===id&&seq===accessSequence.current){setSnapshot({owner:id,records});if(records.serverNow&&Number.isFinite(Date.parse(records.serverNow)))setServerOffset(Date.parse(records.serverNow)-Date.now());setClock(Date.now());}
   return records;
  }catch(error){if(ownerRef.current===id&&seq===accessSequence.current)setSnapshot({owner:id,records:{}});throw error;}
  finally{if(alive.current&&ownerRef.current===id&&seq===accessSequence.current)setAccessLoading(false);}
 },[identity?.id,identity?.confirmed]);
 useEffect(()=>{
  setSnapshot({owner,records:{}});setAccessGate(null);setServerOffset(0);setAccessLoading(false);
  if(identity?.confirmed)void reloadAccess().catch(()=>notify('Access could not be checked. Your free samples are still available.'));
  const listener=NativeAppState.addEventListener('change',status=>{if(status==='active'&&identity?.confirmed)void reloadAccess().catch(()=>{});});
  return()=>listener.remove();
 },[owner,identity?.confirmed,reloadAccess,notify]);
 useEffect(()=>{
  if(config.mode!=='connected'||!identity?.confirmed||Platform.OS==='web')return;
  let cancelled=false;let remove:(()=>void)|undefined;
  storeClient(identity.id).then(Purchases=>{
   if(cancelled)return;
   const changed=()=>{void reloadAccess(true).catch(()=>{});};
   Purchases.addCustomerInfoUpdateListener(changed);remove=()=>Purchases.removeCustomerInfoUpdateListener(changed);
  }).catch(()=>{});
  return()=>{cancelled=true;remove?.();};
 },[identity?.id,identity?.confirmed,reloadAccess]);
 useEffect(()=>{
  if(!authReady)return;
  let active=true;setLoadedOwner(null);setSyncStatus('local');replaceQuestionBank();setBankRevision(n=>n+1);setBankVersion(bundledContent.version);
  storage.load(owner).then(saved=>{
   if(!active)return;
   const next=normaliseState(saved,defaults) as LearnerState;
   if(identity?.confirmed){next.preferences.onboarded=true;if(!next.preferences.name)next.preferences.name=identity.name;}
   setState(next);setLoadedOwner(owner);
  }).catch(()=>{if(active){setState(fresh());setLoadedOwner(owner);notify('Saved progress could not be read. Your cloud history is unchanged.');}});
  return()=>{active=false;};
 },[owner,authReady,notify]);
 function persist(saveOwner:string,value:LearnerState){
  writeQueue.current=writeQueue.current.catch(()=>{}).then(async()=>{if(!blockedOwners.current.has(saveOwner))await storage.save(saveOwner,value);});
  void writeQueue.current.catch(()=>notify('This device could not save progress. Check available storage and try again.'));
 }
 useEffect(()=>{if(loadedOwner!==owner||!authReady)return;persist(owner,state);const sub=NativeAppState.addEventListener('change',v=>{if(v!=='active'&&ownerRef.current===owner)persist(owner,state);});return()=>sub.remove();},[state,owner,loadedOwner,authReady]);
 const ready=loadedOwner===owner&&authReady;
 function commitPack(pack:ContentPack,id:string){if(ownerRef.current!==id||blockedOwners.current.has(id)||!fullAccessRef.current)return;replaceQuestionBank(pack.questions);setBankVersion(pack.version);setBankRevision(n=>n+1);setState(s=>({...s,downloaded:true}));}
 async function installFor(id:string){
  if(downloadJobs.current.has(id))return downloadJobs.current.get(id)!;
  const epoch=packEpoch.current;
  const job=(async()=>{
   if(ownerRef.current===id)setBankLoading(true);
   try{
    const pack:ContentPack=config.mode==='demo'?{packKey:config.packKey,version:bundledContent.version,approved:false,questions:[...questions]}:await downloadContentPack(id);
    if(ownerRef.current!==id||blockedOwners.current.has(id)||!fullAccessRef.current||epoch!==packEpoch.current)return;
    await storage.installPack(id,pack);
    if(alive.current&&epoch===packEpoch.current)commitPack(pack,id);
   }finally{downloadJobs.current.delete(id);if(alive.current&&ownerRef.current===id)setBankLoading(false);}
  })();downloadJobs.current.set(id,job);return job;
 }
 useEffect(()=>{
  if(!ready)return;
  let active=true;
  if(!access.full){replaceQuestionBank();setBankRevision(n=>n+1);setBankLoading(false);return;}
  setBankLoading(true);
  (async()=>{
   try{
    let pack:ContentPack|null=null;
    try{pack=await storage.loadPack(owner,config.packKey);if(pack&&validateQuestionPayload(pack,{approved:config.mode!=='demo',expectedCount:500}).length){await storage.rollbackPack(owner,config.packKey);pack=await storage.loadPack(owner,config.packKey);if(pack&&validateQuestionPayload(pack,{approved:config.mode!=='demo',expectedCount:500}).length)pack=null;}}
    catch{pack=null;}
    if(!active||ownerRef.current!==owner)return;
    if(pack)commitPack(pack,owner);else await installFor(owner);
   }catch{if(active&&ownerRef.current===owner)notify('Your Ontario pack could not be loaded. Retry from Offline packs when connected.');}
   finally{if(active&&ownerRef.current===owner)setBankLoading(false);}
  })();
  return()=>{active=false;};
 },[owner,ready,access.full]);
 // Repair legacy free sessions that an unrelated upgrade prompt accidentally parked.
 useEffect(()=>{if(ready&&!accessLoading)setState(s=>recoverCompatibleSession(s,access,sampleManifest));},[ready,accessLoading,access.kind,owner]);
 const dark=state.preferences.theme==='dark'||(state.preferences.theme==='system'&&system==='dark');
 const patchPreferences=(p:Partial<Preferences>)=>setState(s=>({...s,preferences:{...s.preferences,...p}}));
 function begin(mode:StudyMode,topic?:string){
  if(!ready||accessLoading||bankLoading){notify('Your practice is loading. Please try again in a moment.');return false;}
  if(!canUseFeature(mode,access)){setAccessGate('Full rehearsals are included with Ontario G1 Complete.');return false;}
  if(state.active&&(!canUseFeature(state.active.mode,access)||state.active.questionIds.some(id=>!canRead(id)))){setAccessGate('Your saved session includes Complete questions. Restore access or continue with free practice.');return false;}
  if(access.full&&!state.active&&state.pausedPremium){if(state.pausedPremium.questionIds.every(id=>canRead(id))){setState(s=>({...s,active:s.pausedPremium,pausedPremium:null}));return true;}notify('Download your Ontario pack to resume this saved session.');return false;}
  if(state.active&&!state.active.finishedAt){notify('Your current session is ready to continue.');return true;}
  if(access.full&&questions.length<500){notify('Open Offline packs to download your Ontario G1 question bank.');return false;}
  const ids=mode==='saved'?state.bookmarks:latestMistakes(state.sessions);
  const selected=selectQuestions(allowedQuestions(questions,access,sampleManifest),{mode,topic,ids,count:access.kind==='guest'?10:state.preferences.goal});
  if(mode==='mock'&&selected.length!==40){notify('The complete rehearsal is unavailable. Please update your study pack.');return false;}
  if(!selected.length){if(!access.full&&mode==='topic')setAccessGate('This topic is in Ontario G1 Complete.');else notify(mode==='saved'?'Save a question first.':'Nothing to review yet. Try a quick session.');return false;}
  const title=topic??({quick:'Daily practice',mock:'40-question rehearsal',mistakes:'Mistake review',saved:'Saved questions',topic:'Topic practice'}[mode]);
  setState(s=>({...s,active:{id:Crypto.randomUUID(),mode,title,questionIds:selected.map((q:{id:string})=>q.id),answers:[],index:0,startedAt:new Date().toISOString()}}));return true;
 }
 function answer(optionId:string){setState(s=>{const a=s.active;if(!a||a.answers.length>a.index)return s;const q=questionMap.get(a.questionIds[a.index]!);if(!q||!canRead(q.id)||!q.options.some(o=>o.id===optionId))return s;const item:Answer={id:Crypto.randomUUID(),questionId:q.id,revisionId:q.revision_id,conceptId:q.concept_id,optionId,correct:checkAnswer(q,optionId),section:q.section,topic:q.topic,at:new Date().toISOString()};return {...s,active:{...a,answers:[...a.answers,item]}};});}
 const advanceLock=useRef('');
 function advance(){const a=state.active;if(!a||!canRead(a.questionIds[a.index]!)||a.answers.length<=a.index)return false;const key=a.id+':'+a.index;if(advanceLock.current===key)return false;advanceLock.current=key;const finished=a.index===a.questionIds.length-1;setState(s=>{if(s.active?.id!==a.id||s.active.index!==a.index)return s;if(finished){const done={...s.active,finishedAt:new Date().toISOString()};return {...s,active:null,sessions:s.sessions.some(x=>x.id===done.id)?s.sessions:[...s.sessions,done]};}return {...s,active:{...s.active,index:s.active.index+1}};});return finished;}
 function toggleBookmark(id:string){if(!canRead(id)){setAccessGate('This question is part of Ontario G1 Complete.');return;}setState(s=>{const bookmarked=!s.bookmarks.includes(id);return {...s,bookmarks:bookmarked?[...s.bookmarks,id]:s.bookmarks.filter(x=>x!==id),bookmarkChanges:{...s.bookmarkChanges,[id]:{bookmarked,at:new Date().toISOString()}}};});}
 async function installPack(){if(!access.full){setAccessGate('Offline packs are included with Ontario G1 Complete.');return;}await installFor(owner);if(ownerRef.current===owner)notify('Your Ontario pack is saved for offline practice.');}
 async function removePack(){const id=owner;packEpoch.current++;await downloadJobs.current.get(id)?.catch(()=>{});await storage.removePack(id,config.packKey);if(ownerRef.current!==id)return;replaceQuestionBank();setBankRevision(n=>n+1);setState(s=>({...s,downloaded:false}));notify('Downloaded pack removed. Your practice history is unchanged.');}
 async function resetProgress(){const next={...fresh(),preferences:{...state.preferences},downloaded:state.downloaded};await writeQueue.current.catch(()=>{});await storage.save(owner,next);if(ownerRef.current===owner){setState(next);notify('Local practice history cleared. Cloud history is unchanged.');}}
 async function reminders(enabled:boolean,hour=state.preferences.reminderHour){await setDailyReminder(enabled,hour);patchPreferences({reminders:enabled,reminderHour:hour});notify(enabled?'Your daily reminder is set.':'Daily reminders are off.');}
 async function clearAccountData(){const id=owner;blockedOwners.current.add(id);await writeQueue.current.catch(()=>{});await downloadJobs.current.get(id)?.catch(()=>{});const cleanup=await Promise.allSettled([storage.remove(id),storage.removePack(id,config.packKey),removeAccessCache(id),clearPendingPurchase(id)]);if(cleanup.some(r=>r.status==='rejected'))notify('The account was deleted, but some device data could not be removed. Clear FirstLane’s app storage in device settings.');if(Platform.OS!=='web')await setDailyReminder(false).catch(()=>{});if(ownerRef.current===id){setSnapshot({owner:id,records:{}});replaceQuestionBank();setState(fresh());}}
 async function signOut(){if(Platform.OS!=='web')await setDailyReminder(false).catch(()=>{});if(supabase){const {error}=await supabase.auth.signOut({scope:'local'});if(error&&!blockedOwners.current.has(owner))throw error;}if(config.mode==='demo'){await demoLogout();setDemoIdentity(null);}setSnapshot({owner:'guest',records:{}});setAuth(null);notify('Signed out. Your account progress stays separate from guest progress.');}
 async function purchaseDemo(){if(config.mode!=='demo'||!identity?.confirmed)throw new Error('A verified test account is required.');const id=identity.id,records=await demoPurchase(identity);if(ownerRef.current===id){setSnapshot({owner:id,records});setClock(Date.now());}}
 const syncing=useRef(false);
 async function sync(){if(!supabase||!auth){notify('Sign in to sync your progress.');return;}if(syncing.current)return;syncing.current=true;setSyncStatus('syncing');const id=auth.user.id,current=stateRef.current;
  try{const {client}=await authenticatedClient(id);const merged=await syncProgress(id,current);const {error}=await client.from('beta_profiles').upsert({user_id:id,display_name:current.preferences.name,preferences:current.preferences,updated_at:new Date().toISOString()});if(error)throw error;
   // Re-send queued reports idempotently, then preserve any answers made during the network request.
   const sentIds:string[]=[];for(const report of current.reports.filter(r=>!r.sent)){const {error}=await client.from('beta_reports').insert({id:report.id,user_id:id,question_id:report.questionId||null,message:report.message});if(!error||error.code==='23505')sentIds.push(report.id);}
   if(ownerRef.current===id){setState(s=>({...s,...mergeProgress(s,merged),reports:s.reports.map(r=>sentIds.includes(r.id)?{...r,sent:true}:r)}));setSyncStatus('synced');notify('Your progress is synced.');}
  }catch(error){if(ownerRef.current===id)setSyncStatus('error');throw error;}finally{syncing.current=false;}
 }
 async function report(message:string,questionId?:string){
  message=message.trim();if(message.length<10||message.length>2000)throw new Error('Use between 10 and 2,000 characters.');
  if(questionId&&!canRead(questionId))throw new Error('This question is not available for your account.');
  const id=owner,item={id:Crypto.randomUUID(),questionId,message,createdAt:new Date().toISOString(),sent:false};
  if(supabase&&auth){try{const {client}=await authenticatedClient(id);const {error}=await client.from('beta_reports').insert({id:item.id,user_id:id,question_id:questionId||null,message});if(error)throw error;item.sent=true;}catch(error){if(!permitsOfflineFallback(error))throw error;}}
  if(ownerRef.current===id){setState(s=>({...s,reports:[...s.reports,item]}));notify(item.sent?'Your report was submitted. Thank you.':'Feedback saved on this device; it has not been sent.');}
  return item.sent;
 }

 const value:Store={identity,access,accessRecords,accessLoading,accessGate,setAccessGate,canRead,refreshIdentity,reloadAccess,purchaseDemo,parkPremiumSession:()=>setState(s=>parkIncompatibleSession(s,access,sampleManifest)),state,ready,colors:palette[dark?'dark':'light'],dark,reduceMotion:osReduce||state.preferences.reduceMotion,auth,toast,notify,patchPreferences,begin,answer,advance,toggleBookmark,installPack,removePack,bankLoading,bankVersion,resetProgress,clearAccountData,setReminders:reminders,finishOnboarding:()=>patchPreferences({onboarded:true}),signOut,sync,report,enableDemo:()=>setAccessGate('Ontario G1 Complete unlocks the full Ontario pack.'),syncStatus,owner};
 // bankRevision ensures consumers of the live question map render after an atomic replacement.
 void bankRevision;
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp(){const value=useContext(Context);if(!value)throw new Error('AppProvider is required');return value;}
export function useStats(){const {state}=useApp();return useMemo(()=>activity(state.sessions),[state.sessions]);}
