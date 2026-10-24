import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function webHostBuildSteps(env) {
  // Vercel's production context must not silently export a sandbox app.
  if (env.VERCEL_ENV === 'production' || env.EXPO_PUBLIC_APP_MODE === 'production') {
    return [['scripts/web-release.mjs']];
  }
  return [
    ['scripts/bundle-content.mjs', '--web'],
    ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--max-workers', '1'],
  ];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const localEnv = new URL('../.env.local', import.meta.url);
  if (existsSync(localEnv)) process.loadEnvFile?.(localEnv);
  for (const args of webHostBuildSteps(process.env)) {
    const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
