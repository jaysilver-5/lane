/** Only internal, supported destinations may survive an authentication round trip. */
export function authDestination(value, fallback = '/plans') {
  return ['reset', '/checkout', '/plans', '/membership', '/account', '/(tabs)', '/study', '/progress', '/profile', '/(tabs)/study', '/(tabs)/progress', '/(tabs)/profile'].includes(value) ? value : fallback;
}

export function authCallbackError(href) {
  const url = new URL(href);
  for (const params of [url.searchParams, new URLSearchParams(url.hash.slice(1))]) {
    if (params.has('error') || params.has('error_code')) {
      if (params.get('error') === 'access_denied') return 'Sign-in was cancelled. You can try Google again or use email.';
      return params.get('error_description') || 'This sign-in link has expired or could not be completed. Please try again.';
    }
  }
  return null;
}
