import type { ExpoConfig } from 'expo/config';
// Do not silently treat a store build as a demo. Missing approvals/configuration fail closed.
const production = process.env.EXPO_PUBLIC_APP_MODE === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
if (production) {
  const { releaseIssues } = require('./scripts/release-policy.cjs');
  const { webReleaseIssues } = require('./scripts/web-release-policy.cjs');
  const issues: string[] = process.env.EXPO_PUBLIC_RELEASE_TARGET === 'web' ? webReleaseIssues(__dirname, process.env) : releaseIssues(__dirname, process.env, { checkBundle: false });
  if (issues.length) throw new Error('FirstLane release checks failed:\n' + issues.join('\n'));
}
const config: ExpoConfig = {
  name: 'FirstLane', slug: 'firstlane-driving-prep', version: '0.5.0', scheme: 'firstlane',
  orientation: 'portrait', userInterfaceStyle: 'automatic', icon: './assets/icon.png',
  ios: { supportsTablet: true, bundleIdentifier: process.env.FIRSTLANE_IOS_BUNDLE_ID || 'com.getfirstlane.app.dev', infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: { softwareKeyboardLayoutMode: 'resize', package: process.env.FIRSTLANE_ANDROID_PACKAGE || 'com.getfirstlane.app.dev', adaptiveIcon: { foregroundImage:'./assets/adaptive-icon.png', backgroundColor:'#12392B' } },
  web: { bundler:'metro', output:'single', favicon:'./assets/favicon.png', name:'FirstLane — Get road ready.' },
  plugins: ['./plugins/withBillingLaunchMode','expo-router','expo-sqlite','expo-secure-store',['expo-splash-screen',{image:'./assets/splash.png',imageWidth:160,resizeMode:'contain',backgroundColor:'#F6F5EF',dark:{backgroundColor:'#131D17'}}],['expo-notifications',{color:'#D9F778'}]],
  experiments: { typedRoutes: false, baseUrl: ['ios', 'android'].includes(process.env.EAS_BUILD_PLATFORM || '') ? '' : process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app' },
  extra: { brand:'FirstLane', website:'https://getfirstlane.com', tagline:'Get road ready.', stage: production ? 'production' : 'development', eas:{projectId:process.env.EAS_PROJECT_ID || 'a471737e-1390-419d-9336-2f94b601fb26'} },
};
export default config;
