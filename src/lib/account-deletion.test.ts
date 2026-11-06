import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deleteAccountWithPassword,
  type DeleteAccountDependencies,
} from './account-deletion.ts'

function setup(overrides: Partial<DeleteAccountDependencies> = {}) {
  const calls: string[] = []
  const deps: DeleteAccountDependencies = {
    getUser: async (token) => {
      calls.push(`session:${token}`)
      return { id: 'owner', email: 'owner@example.test' }
    },
    consumeAttempt: async (userId) => {
      calls.push(`limit:${userId}`)
      return { allowed: true, retryAfterSeconds: 0 }
    },
    verifyPassword: async (email, password) => {
      calls.push(`password:${email}:${password}`)
      return { status: 'verified', userId: 'owner' }
    },
    deleteUser: async (id) => {
      calls.push(`delete:${id}`)
      return true
    },
    ...overrides,
  }
  return { calls, deps }
}

test('rejects missing authorization, password, or confirmation before contacting Supabase', async () => {
  for (const [token, password, confirmation] of [
    ['', 'valid-account-password', 'DELETE'],
    ['session-token', '', 'DELETE'],
    ['session-token', 'valid-account-password', 'delete'],
  ]) {
    const { calls, deps } = setup()
    assert.equal(
      (await deleteAccountWithPassword(token, password, confirmation, deps)).ok,
      false,
    )
    assert.deepEqual(calls, [])
  }
})

test('deletes only the authenticated account after Supabase verifies its account password', async () => {
  const { calls, deps } = setup()
  const result = await deleteAccountWithPassword(
    'session-token',
    'account-password',
    'DELETE',
    deps,
  )
  assert.equal(result.ok, true)
  assert.deepEqual(calls, [
    'session:session-token',
    'limit:owner',
    'password:owner@example.test:account-password',
    'delete:owner',
  ])
})

test('does not use or require a vault password during account deletion', async () => {
  const { calls, deps } = setup()
  const result = await deleteAccountWithPassword(
    'session-token',
    'account-password-only',
    'DELETE',
    deps,
  )
  assert.equal(result.ok, true)
  assert.equal(calls.some((call) => call.includes('vault')), false)
})

test('blocks incorrect account passwords without deleting anything', async () => {
  const { calls, deps } = setup({ verifyPassword: async () => ({ status: 'invalid' }) })
  const result = await deleteAccountWithPassword(
    'session-token',
    'incorrect-password',
    'DELETE',
    deps,
  )
  assert.equal(result.status, 403)
  assert.match(result.message, /account password is incorrect/i)
  assert.equal(calls.some((call) => call.startsWith('delete:')), false)
})

test('checks the password again on every deletion attempt', async () => {
  let verifications = 0
  const { deps } = setup({
    verifyPassword: async () => { verifications += 1; return { status: 'verified', userId: 'owner' } },
    deleteUser: async () => false,
  })
  await deleteAccountWithPassword('session-token', 'password', 'DELETE', deps)
  await deleteAccountWithPassword('session-token', 'password', 'DELETE', deps)
  assert.equal(verifications, 2)
})

test('fails closed if rate limiting or password verification is unavailable', async () => {
  const limiter = setup({ consumeAttempt: async () => { throw new Error('offline') } })
  assert.equal((await deleteAccountWithPassword('token', 'password', 'DELETE', limiter.deps)).status, 503)
  assert.equal(limiter.calls.some((call) => call.startsWith('password:')), false)
  const verifier = setup({ verifyPassword: async () => ({ status: 'unavailable' }) })
  assert.equal((await deleteAccountWithPassword('token', 'password', 'DELETE', verifier.deps)).status, 503)
  assert.equal(verifier.calls.some((call) => call.startsWith('delete:')), false)
})

test('requires a fresh password check for the currently authenticated identity', async () => {
  const expired = setup({ getUser: async () => null })
  assert.equal(
    (await deleteAccountWithPassword('expired', 'password', 'DELETE', expired.deps)).status,
    401,
  )
  assert.deepEqual(expired.calls, [])

  const mismatch = setup({
    verifyPassword: async () => ({ status: 'verified', userId: 'another-user' }),
  })
  const result = await deleteAccountWithPassword(
    'session-token',
    'password',
    'DELETE',
    mismatch.deps,
  )
  assert.equal(result.status, 403)
  assert.equal(mismatch.calls.some((call) => call.startsWith('delete:')), false)
})

test('rate limits password guesses before verification and reports retry time', async () => {
  const { calls, deps } = setup({
    consumeAttempt: async () => ({ allowed: false, retryAfterSeconds: 321 }),
  })
  const result = await deleteAccountWithPassword(
    'session-token',
    'password',
    'DELETE',
    deps,
  )
  assert.equal(result.status, 429)
  assert.equal(result.retryAfterSeconds, 321)
  assert.equal(calls.some((call) => call.startsWith('password:')), false)
  assert.equal(calls.some((call) => call.startsWith('delete:')), false)
})

test('does not report failed deletion as successful', async () => {
  for (const deleteUser of [
    async () => false,
    async () => { throw new Error('service unavailable') },
  ]) {
    const { deps } = setup({ deleteUser })
    const result = await deleteAccountWithPassword(
      'session-token',
      'password',
      'DELETE',
      deps,
    )
    assert.equal(result.status, 500)
    assert.equal(result.ok, false)
  }
})
