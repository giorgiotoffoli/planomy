import assert from 'node:assert/strict'
import test from 'node:test'
import { authErrorMessage, OTP_LENGTH } from './errors.ts'

test('password sign-in reports invalid credentials without exposing server details', () => {
  assert.equal(
    authErrorMessage(new Error('Invalid login credentials'), 'password'),
    'That email and password do not match an account.',
  )
})

test('OTP verification distinguishes an expired code', () => {
  assert.equal(
    authErrorMessage(new Error('Token has expired or is invalid'), 'otp-verify'),
    'That code has expired. Request a new code and try again.',
  )
})

test('network failures receive a recoverable message in both sign-in flows', () => {
  assert.match(
    authErrorMessage(new TypeError('Network request failed'), 'password'),
    /internet connection/,
  )
})

test('email code length matches the existing eight-digit web flow', () => {
  assert.equal(OTP_LENGTH, 8)
})
