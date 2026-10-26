import test from 'node:test';
import assert from 'node:assert/strict';
import { telemetryRoute, sanitizeTelemetryEvent } from '../src/domain/webTelemetry.mjs';

test('screen reporting respects the app mount and strips query/fragment data', () => {
  for (const path of ['/', '/app', '/app/']) assert.equal(telemetryRoute(path), '/app');
  assert.equal(telemetryRoute('/study'), '/app/study');
  assert.equal(telemetryRoute('/app/auth/sign-up?email=learner%40example.com#code=secret'), '/app/auth/sign-up');
  const event = sanitizeTelemetryEvent({ type: 'pageview', url: 'https://www.getfirstlane.com/app/quiz?question=private-id&email=learner%40example.com#token=secret' });
  assert.deepEqual(event, { type: 'pageview', url: 'https://www.getfirstlane.com/app/quiz' });
});

test('auth callbacks, payment returns and unknown paths are excluded', () => {
  for (const path of ['/app/auth/callback?code=secret', '/app/auth/sso', '/app/checkout/return?transaction=private', '/app/learner/private-id', '/application', '/privacy']) {
    assert.equal(telemetryRoute(path), null, path);
    assert.equal(sanitizeTelemetryEvent({ type: 'vital', url: 'https://www.getfirstlane.com' + path }), null, path);
  }
});

test('performance reports contain only a known screen URL and route', () => {
  assert.deepEqual(sanitizeTelemetryEvent({ type: 'vital', url: 'https://www.getfirstlane.com/app/checkout?transaction=private', route: '/app/checkout?transaction=private' }), {
    type: 'vital', url: 'https://www.getfirstlane.com/app/checkout', route: '/app/checkout',
  });
  for (const url of ['javascript:alert(1)', 'data:text/plain,private', 'https://user:secret@www.getfirstlane.com/app']) {
    assert.equal(sanitizeTelemetryEvent({ type: 'pageview', url }), null);
  }
});
