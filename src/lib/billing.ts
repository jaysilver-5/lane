import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authenticatedClient } from './supabase';
import { config } from '../config';
let configured=false,configuredUser='';
let setup:Promise<unknown>=Promise.resolve();
const purchaseLocks=new Set<string>();
let purchaseOwner:string|null=null;
/** RevenueCat orchestrates purchases. Only the server commerce mirror grants protected content. */
export async function storeClient(userId:string){
 if(config.mode!=='connected')throw new Error('Store billing is unavailable in test mode.');
 if(Platform.OS==='web')throw new Error('Purchases are available in the installed iOS or Android app.');
 if(!userId)throw new Error('Sign in before using the store.');
 const key=Platform.OS==='ios'?process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY:process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
 if(!key)throw new Error('Purchases are temporarily unavailable. No payment has been taken.');
 const task=setup.catch(()=>{}).then(async()=>{
  if(purchaseOwner&&purchaseOwner!==userId)throw new Error('Another account has an open store request. Finish it before switching purchases.');
  const {default:Purchases}=await import('react-native-purchases');
  if(!configured){Purchases.configure({apiKey:key,appUserID:userId});configured=true;configuredUser=userId;}
  else if(configuredUser!==userId){await Purchases.logIn(userId);configuredUser=userId;}
  return Purchases;
 });setup=task;return task;
}
export async function fetchStoreOffer(userId:string){
 const Purchases=await storeClient(userId),productId=Platform.OS==='ios'?config.billing.iosProductId:config.billing.androidProductId;
 const {PRODUCT_CATEGORY}=await import('react-native-purchases');
 const products=await Purchases.getProducts([productId],PRODUCT_CATEGORY.NON_SUBSCRIPTION),product=products.find(p=>p.identifier===productId);
 if(!product)throw new Error('Ontario G1 Complete is not available in your store yet. Nothing has been charged.');
 // Do not advertise CA$14.99 but charge a different Canadian store price.
 if(product.currencyCode==='CAD'&&Math.round(product.price*100)!==config.offer.amount)throw new Error('The Canadian store price is being updated. Please try again later. No payment was taken.');
 return product;
}
const pendingKey=(userId:string)=>'firstlane-pending-v3:'+userId;
export async function pendingPurchase(userId:string){return !!await AsyncStorage.getItem(pendingKey(userId));}
export async function clearPendingPurchase(userId:string){await AsyncStorage.removeItem(pendingKey(userId));}
export async function purchasePreparation(userId:string){
 if(purchaseLocks.has(userId))return {status:'pending' as const};
 if(purchaseOwner&&purchaseOwner!==userId)throw new Error('Another purchase is still being processed.');
 purchaseLocks.add(userId);purchaseOwner=userId;
 try {
  await authenticatedClient(userId);
  if(await pendingPurchase(userId))return {status:'pending' as const};
  const Purchases=await storeClient(userId),product=await fetchStoreOffer(userId);
  const {PURCHASES_ERROR_CODE}=await import('react-native-purchases');
  // Persist before opening the sheet so an interruption cannot invite a duplicate purchase.
  await AsyncStorage.setItem(pendingKey(userId),new Date().toISOString());
  try {
   if(configuredUser!==userId)throw new Error('Your store account changed. Check purchase status before continuing.');
   const result=await Purchases.purchaseStoreProduct(product);
   return {status:result.customerInfo.entitlements.active[config.billing.entitlementId]?'verified' as const:'submitted' as const};
  }catch(error:any){
   if(error?.userCancelled){await clearPendingPurchase(userId);return {status:'cancelled' as const};}
   if(error?.code===PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)return {status:'pending' as const};
   // A known store rejection is not an in-flight payment. Unknown/network failures retain the marker.
   if([PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR,PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR,PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR].includes(error?.code))await clearPendingPurchase(userId);
   throw error;
  }
 }finally{purchaseLocks.delete(userId);if(purchaseOwner===userId)purchaseOwner=null;}
}
export async function restoreAccess(userId?:string){
 if(!userId)throw new Error('Sign in to restore your purchase.');
 if(purchaseOwner)throw new Error('Finish the open purchase before restoring.');
 purchaseOwner=userId;
 try{await authenticatedClient(userId);if(Platform.OS!=='web'){const Purchases=await storeClient(userId);await Purchases.restorePurchases();}return await readAccess(userId);}
 finally{if(purchaseOwner===userId)purchaseOwner=null;}
}
export async function readAccess(expectedUserId?:string){
 const {client,user}=await authenticatedClient(expectedUserId);
 const {data,error}=await client.rpc('firstlane_my_access',{p_pack_key:config.packKey});if(error)throw error;
 if(data?.paid?.lifetime===true&&typeof data.paid.startsAt==='string'&&!data.paid.revokedAt)await clearPendingPurchase(user.id);
 return data;
}
export async function paymentHistory(userId:string){const {client}=await authenticatedClient(userId);const {data,error}=await client.rpc('firstlane_my_receipts');if(error)throw error;return data||[];}
