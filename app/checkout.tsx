import React, {useCallback,useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {useApp} from '../src/state/AppState';
import {config} from '../src/config';
import {clearPendingPurchase,fetchStoreOffer,pendingPurchase,purchasePreparation} from '../src/lib/billing';
import {humanError} from '../src/lib/supabase';
import {resolveAccess} from '../src/domain/access.mjs';
import {Button,Card,Chip,Copy,Heading,Muted,Note,Row,Screen} from '../src/components/UI';

export default function Checkout(){
 const router=useRouter(),{identity,access,accessLoading,purchaseDemo,reloadAccess,notify}=useApp();
 const [price,setPrice]=useState(config.mode==='demo'?config.offer.label:''),[error,setError]=useState('');
 const [pending,setPending]=useState(false),[busy,setBusy]=useState(false),[offerLoading,setOfferLoading]=useState(false);
 const [pendingLoaded,setPendingLoaded]=useState(config.mode==='demo'),[retry,setRetry]=useState(0);
 const alive=useRef(true),currentUser=useRef(identity?.id),checking=useRef(false),buying=useRef(false);
 currentUser.current=identity?.id;
 const native=config.mode==='demo'||Platform.OS!=='web';
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  let valid=true;setError('');setPending(false);setPendingLoaded(config.mode==='demo');
  setPrice(config.mode==='demo'?config.offer.label:'');
  if(config.mode==='demo'||!identity?.confirmed||!native)return;
  setOfferLoading(true);
  // Unknown pending state is not permission to charge again.
  pendingPurchase(identity.id).then(value=>{if(valid){setPending(value);setPendingLoaded(true);}}).catch(()=>{if(valid)setError('Your last purchase status could not be read. Restart the app or contact support before purchasing.');});
  fetchStoreOffer(identity.id).then(product=>{if(valid)setPrice(product.priceString);})
   .catch(e=>{if(valid)setError(humanError(e));}).finally(()=>{if(valid)setOfferLoading(false);});
  return()=>{valid=false;};
 },[identity?.id,identity?.confirmed,native,retry]);
 const check=useCallback(async()=>{
  const account=identity;
  if(!account?.confirmed||checking.current)return false;
  checking.current=true;
  try{
   const records=await reloadAccess(true); // Never use a cached grant to confirm a new charge.
   if(!alive.current||currentUser.current!==account.id)return false;
   const verified=resolveAccess(account,records,records.serverNow?Date.parse(records.serverNow):Date.now()).kind==='paid';
   if(verified){await clearPendingPurchase(account.id);if(alive.current&&currentUser.current===account.id)router.replace('/payment-success');return true;}
   return false;
  }finally{checking.current=false;}
 },[identity?.id,identity?.confirmed,reloadAccess,router]);
 useEffect(()=>{
  if(!pending||!identity?.confirmed||config.mode==='demo')return;
  let attempts=0;
  const timer=setInterval(()=>{if(++attempts>12){clearInterval(timer);return;}void check().catch(()=>{});},5000);
  return()=>clearInterval(timer);
 },[pending,identity?.id,identity?.confirmed,check]);
 async function buy(){
  if(!identity){router.push({pathname:'/auth/sign-up',params:{next:'/checkout'}});return;}
  if(!identity.confirmed){router.push({pathname:'/auth/verify-email',params:{email:identity.email,next:'/checkout'}});return;}
  if(buying.current||pending||!native||!pendingLoaded||!price)return;
  buying.current=true;setBusy(true);setError('');const accountId=identity.id;
  try{
   if(config.mode==='demo'){await purchaseDemo();if(alive.current&&currentUser.current===accountId)router.replace('/payment-success');return;}
   const result=await purchasePreparation(accountId);
   if(!alive.current||currentUser.current!==accountId)return;
   if(result.status==='cancelled'){notify('Purchase cancelled. Check your store receipt if a charge appears.');return;}
   // SDK entitlement delivery may precede the durable server webhook. Do not show success yet.
   setPending(true);
   try{await check();}catch{setError('Your payment may still be processing. Check purchase status before trying again.');}
  }catch(e){
   if(alive.current&&currentUser.current===accountId){setError(humanError(e));const submitted=await pendingPurchase(accountId).catch(()=>true);if(alive.current&&currentUser.current===accountId)setPending(submitted);}
  }finally{buying.current=false;if(alive.current)setBusy(false);}
 }
 if(access.kind==='paid')return <Screen back><Heading>Ontario G1 Complete is already yours.</Heading><Button onPress={()=>router.replace('/membership')}>View purchase</Button></Screen>;
 const footer=!native?<Button kind="secondary" onPress={()=>router.replace('/(tabs)')}>Continue free practice</Button>:pending?<Button kind="secondary" loading={busy} onPress={async()=>{setError('');if(!await check())notify('Your purchase is still awaiting confirmation. Please do not purchase again.');}}>Check purchase status</Button>:<Button loading={busy} disabled={accessLoading||!!identity?.confirmed&&(!price||!pendingLoaded||offerLoading)} onPress={buy}>{!identity?'Create an account to purchase':!identity.confirmed?'Verify your email':config.mode==='demo'?`Simulate ${price} purchase`:price?`Pay ${price} once`:'Purchase unavailable'}</Button>;
 return <Screen back title="Review purchase" footer={footer}>
  <Heading eyebrow="ONE PURCHASE. YOUR ONTARIO PACK." sub="Complete G1 preparation without a recurring bill.">Unlock it once.{`\n`}Keep moving.</Heading>
  <Card><Row style={{justifyContent:'space-between',flexWrap:'wrap'}}><Chip selected>ONTARIO G1 COMPLETE</Chip><Chip>NO EXPIRY</Chip></Row><Copy size={25} weight="700">Full Ontario G1 pack</Copy><Muted>One purchase unlocks the Ontario pack for this FirstLane account. It does not renew and does not expire.</Muted><Row style={{justifyContent:'space-between',flexWrap:'wrap'}}><Copy weight="700">Pay once</Copy><Copy size={30} weight="700">{price||config.offer.label}</Copy></Row><Muted size={12}>{price?'Your store shows the final charge and applicable tax.':'Canadian price: CA$14.99. Your local store price will appear before payment.'}</Muted></Card>
  <Card><Copy weight="700">What you keep</Copy><Muted>Full question bank, topic practice, rehearsals, explanations, mistake review and offline practice for Ontario G1. Future locations are separate products.</Muted></Card>
  {!native&&<Note>Purchases are available in the installed iOS or Android app. This web experience does not take payments.</Note>}
  {config.mode==='demo'&&<Note tone="warning">TEST CHECKOUT · This simulates a purchase. No money is charged and no real entitlement is granted.</Note>}
  {!!error && <Note tone="warning">{error}</Note>}
  {!!error && !pending && native && <Button kind="secondary" icon="refresh" onPress={()=>setRetry(n=>n+1)}>Retry store connection</Button>}
  {pending&&<><Note>Purchase submitted. Access will unlock after payment confirmation. Do not purchase again while this is pending.</Note><Button kind="ghost" onPress={()=>router.push('/support')}>Contact support</Button></>}
  <Muted size={11} style={{textAlign:'center'}}>Apple or Google handles your payment. FirstLane never collects card details.</Muted><Button kind="ghost" icon={null} onPress={()=>router.push('/legal')}>Privacy & purchase terms</Button>
 </Screen>;
}
