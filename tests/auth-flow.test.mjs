import test from 'node:test';
import assert from 'node:assert/strict';
import { authDestination, authCallbackError } from '../src/domain/authFlow.mjs';

test('auth preserves checkout but rejects external and unsupported return destinations', () => {
  assert.equal(authDestination('/checkout'), '/checkout');
  assert.equal(authDestination('reset'), 'reset');
  for (const next of ['/membership', '/account', '/progress', '/profile', '/(tabs)/progress']) assert.equal(authDestination(next), next);
  for (const next of ['https://evil.example', '//evil.example', '/auth/google', '/checkout?next=https://evil.example', undefined, ['/checkout']]) {
    assert.equal(authDestination(next), '/plans');
  }
});

test('OAuth cancellation and expired email links are detected before trusting a cached session', () => {
  assert.match(authCallbackError('https://app.example/auth/callback?error=access_denied'), /cancelled/);
  assert.equal(authCallbackError('https://app.example/auth/callback#error=otp_expired&error_description=Link+expired'), 'Link expired');
  assert.match(authCallbackError('https://app.example/auth/callback?error_code=bad_code'), /expired/);
  assert.equal(authCallbackError('https://app.example/auth/callback?code=valid&next=%2Fcheckout'), null);
});
