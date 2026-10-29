import { withWebBasePath } from '../domain/webLocation.mjs';

// Keep in sync with experiments.baseUrl in app.config.ts. Expo Router adds this
// automatically; use this helper only for browser/Clerk/Paddle URLs.
export function appWebPath(path: string) {
  return withWebBasePath(path, process.env.NODE_ENV === 'development' ? '' : process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app');
}
