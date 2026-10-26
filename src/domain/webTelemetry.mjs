// Only static screen names enter reports. Query values can contain email,
// authentication codes, question IDs and payment references.
const screens = new Set([
  '/', '/study', '/progress', '/profile', '/plans', '/onboarding', '/quiz',
  '/results', '/session-review', '/question', '/topic', '/saved', '/mistakes',
  '/display', '/membership', '/account', '/legal', '/support', '/checkout',
  '/auth/sign-in', '/auth/sign-up', '/auth/forgot-password',
  '/auth/reset-password', '/auth/verify-email',
]);

/** @param {string} value */
export function telemetryRoute(value) {
  try {
    const url = new URL(value, 'https://www.getfirstlane.com');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    let path = url.pathname.replace(/\/$/, '') || '/';
    if (path === '/app') path = '/';
    else if (path.startsWith('/app/')) path = path.slice(4);
    return screens.has(path) ? '/app' + (path === '/' ? '' : path) : null;
  } catch { return null; }
}

/**
 * @template {{url: string, route?: string}} T
 * @param {T} event
 * @returns {T | null}
 */
export function sanitizeTelemetryEvent(event) {
  const route = telemetryRoute(event.url);
  if (!route) return null;
  try {
    const url = new URL(event.url, 'https://www.getfirstlane.com');
    return { ...event, url: url.origin + route, ...('route' in event ? { route } : {}) };
  } catch { return null; }
}
