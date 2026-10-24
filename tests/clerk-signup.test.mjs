import test from 'node:test';
import assert from 'node:assert/strict';
import { clerkSignupStep } from '../src/domain/clerkSignup.mjs';

const pending = { id: 'signup_A', status: 'missing_requirements', missingFields: [], unverifiedFields: ['email_address'] };
test('email signup continues to verification while email remains unverified', () => {
  assert.equal(clerkSignupStep(pending, null), 'verify-email');
});
test('a replacement completed snapshot finalizes after verification; the old snapshot cannot imply success', () => {
  const complete = { ...pending, status: 'complete', unverifiedFields: [] };
  assert.equal(clerkSignupStep(pending, null), 'verify-email');
  assert.equal(clerkSignupStep(complete, null), 'finalize');
});
test('a session created during verification connects rather than displaying stale missing requirements', () => {
  assert.equal(clerkSignupStep({ ...pending, missingFields: ['first_name'] }, { status: 'active' }), 'connect');
});
test('actual remaining details stay in signup even after email verification', () => {
  assert.equal(clerkSignupStep({ ...pending, missingFields: ['first_name'], unverifiedFields: [] }, null), 'details');
  assert.equal(clerkSignupStep({ ...pending, missingFields: ['legal_accepted'] }, null), 'details');
});
test('pending sessions and security tasks cannot take the active-session shortcut', () => {
  const complete = { ...pending, status: 'complete', unverifiedFields: [] };
  assert.equal(clerkSignupStep(complete, { status: 'pending' }), 'security');
  assert.equal(clerkSignupStep(complete, { status: 'active', currentTask: { key: 'setup-mfa' } }), 'security');
});
test('abandoned, absent and unresolved signup states never imply completion', () => {
  assert.equal(clerkSignupStep({ ...pending, status: 'abandoned' }, null), 'restart');
  assert.equal(clerkSignupStep({ status: null }, null), 'restart');
  assert.equal(clerkSignupStep({ ...pending, unverifiedFields: [] }, null), 'pending');
});
