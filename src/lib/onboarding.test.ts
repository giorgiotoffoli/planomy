import assert from 'node:assert/strict'
import test from 'node:test'
import { ONBOARDING_VERSION, resolveOnboardingState } from './onboarding.ts'

test('new accounts start at the welcome step', () => {
  assert.equal(resolveOnboardingState({}, false, false).step, 'welcome')
})

test('started accounts without a password stop before encryption setup', () => {
  assert.equal(
    resolveOnboardingState(
      { onboarding_status: 'started', onboarding_version: ONBOARDING_VERSION },
      false,
      false,
    ).step,
    'account-password',
  )
})

test('accounts with a keychain still require a missing account password', () => {
  const state = resolveOnboardingState({}, true, false)

  assert.equal(state.complete, false)
  assert.equal(state.step, 'account-password')
})

test('accounts with a password continue to encryption setup', () => {
  assert.equal(
    resolveOnboardingState(
      { onboarding_status: 'started', onboarding_version: ONBOARDING_VERSION },
      false,
      true,
    ).step,
    'security',
  )
})

test('started accounts with security setup continue to the first task', () => {
  assert.equal(
    resolveOnboardingState(
      { onboarding_status: 'started', onboarding_version: ONBOARDING_VERSION },
      true,
      true,
    ).step,
    'first-task',
  )
})

test('completed legacy accounts remain complete when they have a password', () => {
  assert.equal(resolveOnboardingState({}, true, true).complete, true)
})
