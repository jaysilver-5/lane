import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { webHostBuildSteps } from '../scripts/web-host-build.mjs';

test('Vercel production uses the web release gate even with connected sandbox variables', () => {
  assert.deepEqual(webHostBuildSteps({ VERCEL_ENV: 'production', EXPO_PUBLIC_APP_MODE: 'connected' }), [['scripts/web-release.mjs']]);
  assert.deepEqual(webHostBuildSteps({ EXPO_PUBLIC_APP_MODE: 'production' }), [['scripts/web-release.mjs']]);
});

test('preview exports the real web bundle without requiring native store credentials', () => {
  const steps = webHostBuildSteps({ VERCEL_ENV: 'preview', EXPO_PUBLIC_APP_MODE: 'connected' });
  assert.equal(steps[0][0], 'scripts/bundle-content.mjs');
  assert.ok(steps[0].includes('--web'));
  assert.equal(steps[1][0], 'node_modules/expo/bin/cli');
  assert.ok(steps[1].includes('web'));
});
test('only an explicitly selected acceptance stage defers public acceptance',()=>{
 assert.deepEqual(webHostBuildSteps({VERCEL_ENV:'production',FIRSTLANE_WEB_DEPLOYMENT_STAGE:'acceptance'}),[['scripts/web-release.mjs','--acceptance']]);
 assert.deepEqual(webHostBuildSteps({VERCEL_ENV:'production',FIRSTLANE_WEB_DEPLOYMENT_STAGE:'misspelled'}),[['scripts/web-release.mjs']]);
});

test('actual production host command refuses the current unapproved release before export', () => {
  const result = spawnSync(process.execPath, ['scripts/web-host-build.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, VERCEL_ENV: 'production', EXPO_PUBLIC_APP_MODE: 'connected' },
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Web public launch blocked/);
  assert.match(result.stderr, /authEmailAndRecoveryPassed/);
  assert.doesNotMatch(result.stdout, /Exported|Bundled/);
});
