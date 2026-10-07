import { OFFER } from './domain/offer.mjs';
import { runtimeMode } from './domain/environment.mjs';

// Static dot-notation is required for Expo to inline public environment values.
const stage = process.env.EXPO_PUBLIC_APP_MODE || 'connected';
export const config = {
    brand: 'FirstLane', website: 'https://getfirstlane.com', tagline: 'Get road ready.',
    mode: runtimeMode(stage),
    isProduction: stage === 'production',
    packKey: OFFER.packKey, packName: 'Ontario G1', contentVersion: '0.1.0',
    offer: { amount: OFFER.amountMinor, currency: OFFER.currency, label: OFFER.priceLabel, term: OFFER.term, autoRenew: OFFER.autoRenew },
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '',
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || '',
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || '',
    deletionUrl: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL || '',
    operatorName: process.env.EXPO_PUBLIC_OPERATOR_NAME || '',
    billing: { iosProductId: OFFER.productId, androidProductId: OFFER.productId, entitlementId: OFFER.entitlementId },
} as const;
