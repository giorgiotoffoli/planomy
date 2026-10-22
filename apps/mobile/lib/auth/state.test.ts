import assert from 'node:assert/strict'
import test from 'node:test'
import {
  initialAuthState,
  reduceAuthState,
  type AuthUser,
} from './state.ts'

const user: AuthUser = { id: 'user-1', email: 'person@example.com' }

test('cold restore with no session becomes unauthenticated', () => {
  assert.deepEqual(reduceAuthState(initialAuthState, { type: 'restored', user: null }), {
    status: 'unauthenticated',
  })
})

test('cold restore and sign-in always stop at authenticated-but-locked', () => {
  assert.deepEqual(reduceAuthState(initialAuthState, { type: 'restored', user }), {
    status: 'authenticated-but-locked',
    user,
  })
  assert.deepEqual(reduceAuthState(initialAuthState, { type: 'signed-in', user }), {
    status: 'authenticated-but-locked',
    user,
  })
})

test('vault state only changes after an explicit vault event', () => {
  const locked = { status: 'authenticated-but-locked' as const, user }
  const unlocked = reduceAuthState(locked, { type: 'vault-unlocked' })
  assert.equal(unlocked.status, 'unlocked')
  assert.equal(reduceAuthState(unlocked, { type: 'vault-locked' }).status, 'authenticated-but-locked')
})

test('same-user token refresh preserves unlock; account switch relocks', () => {
  const unlocked = { status: 'unlocked' as const, user }
  assert.equal(
    reduceAuthState(unlocked, { type: 'session-updated', user: { ...user, email: 'new@example.com' } }).status,
    'unlocked',
  )
  assert.equal(
    reduceAuthState(unlocked, { type: 'session-updated', user: { id: 'user-2', email: null } }).status,
    'authenticated-but-locked',
  )
})

test('sign-out clears the user and can carry a session-expiry message', () => {
  const state = { status: 'authenticated-but-locked' as const, user }
  assert.deepEqual(reduceAuthState(state, { type: 'signed-out', message: 'Session expired.' }), {
    status: 'unauthenticated',
    message: 'Session expired.',
  })
})
