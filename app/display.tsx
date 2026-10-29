// Expo Router currently strips the /app mount from internal /appearance links
// without a segment boundary. Use a route that cannot collide with the mount;
// the original /appearance page remains available for existing bookmarks.
export { default } from './appearance';
