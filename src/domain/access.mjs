import { OFFER } from './offer.mjs';
/** Shared UX access rules. Supabase/RevenueCat remain the connected-mode authorities. */
export const PLAN = Object.freeze({
  packKey:'CA-ON-G1', guestCount:10, freeCount:40,
  amountMinor:OFFER.amountMinor, currency:OFFER.currency, priceLabel:OFFER.priceLabel, entitlementId:OFFER.entitlementId
});
export function resolveAccess(identity, records={}, now=Date.now()) {
 if(!identity?.confirmed)return {kind:'guest',full:false,endsAt:null,lifetime:false,label:'Guest access'};
 const paid=records.paid;
 if(paid && typeof paid === 'object' && typeof paid.startsAt === 'string' && !paid.revokedAt){
   const startsOk=Number.isFinite(Date.parse(paid.startsAt)) && Date.parse(paid.startsAt)<=now;
   const lifetime=paid.lifetime===true && paid.endsAt==null;
   const dated=typeof paid.endsAt==='string' && Number.isFinite(Date.parse(paid.endsAt)) && Date.parse(paid.endsAt)>now;
   // offlineUntil is a verification-cache boundary, not a purchase expiry.
   const cacheOk=!records.offlineUntil || (Number.isFinite(Date.parse(records.offlineUntil)) && Date.parse(records.offlineUntil)>now);
   if(startsOk && cacheOk && (lifetime||dated)) return {kind:'paid',full:true,endsAt:lifetime?null:paid.endsAt,lifetime,label:'Ontario Complete'};
 }
 return {kind:'free',full:false,endsAt:null,lifetime:false,label:'FirstLane Free'};
}
export function allowedIds(access,manifest) { return access.full ? null : new Set(access.kind==='guest'?manifest.guestQuestionIds:manifest.freeQuestionIds); }
export function canReadQuestion(id,access,manifest) {const ids=allowedIds(access,manifest);return ids===null||ids.has(id);}
export function allowedQuestions(bank,access,manifest) {const ids=allowedIds(access,manifest);return bank.filter(q=>q.pack_key===PLAN.packKey && (ids===null||ids.has(q.id)));}
export function canUseFeature(feature,access) {
 if(['mock','offline','all-topics'].includes(feature))return access.full;
 return true;
}
export function accessDescription(access) {
 if(access.kind==='paid')return access.lifetime?'Ontario G1 unlocked · One-time purchase':'Ontario G1 unlocked';
 return access.kind==='guest'?'10 fixed questions · No account needed':'40 fixed questions · Free forever';
}
