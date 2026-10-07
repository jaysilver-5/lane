if (process.env.EXPO_PUBLIC_APP_MODE === 'production' || process.env.EAS_BUILD_PROFILE === 'production') await import('./release-check.mjs');
else console.log('Internal build: release acceptance checks are not being bypassed for a production build.');
