import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { authDestination } from '../domain/authFlow.mjs';
import { appWebPath } from './webLocation';

/** Keep browser email links on the origin where the PKCE verifier was stored. */
export function authRedirect(next = '/plans') {
  const destination = authDestination(next);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(appWebPath('/auth/callback'), window.location.origin);
    url.searchParams.set('next', destination);
    return url.href;
  }
  return Linking.createURL('auth/callback', { queryParams: { next: destination } });
}
