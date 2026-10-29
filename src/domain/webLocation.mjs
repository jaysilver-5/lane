/** Browser-only links used outside Expo Router must include the export mount. */
export function withWebBasePath(path, basePath = '/app') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) {
    throw new Error('Expected an app-relative path.');
  }
  if (basePath !== '' && basePath !== '/app') throw new Error('Web base path must be /app or empty.');
  return basePath + (path === '/' ? '' : path) || '/';
}
