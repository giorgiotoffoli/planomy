import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteAccountWithCode, type DeleteAccountDependencies } from './account-deletion.ts'

function setup(overrides: Partial<DeleteAccountDependencies> = {}) {
  const calls: string[] = []
  const deps: DeleteAccountDependencies = {
    getUser: async (token) => { calls.push(`session:${token}`); return { id: 'owner', email: 'owner@example.test' } },
    verifyCode: async (email, code) => { calls.push(`code:${email}:${code}`); return { id: 'owner' } },
    deleteUser: async (id) => { calls.push(`delete:${id}`); return true },
    ...overrides,
  }
  return { calls, deps }
}

test('rejects missing authorization or confirmation before contacting Supabase', async () => {
  for (const [token, code, confirmation] of [
    ['', '12345678', 'DELETE'],
    ['session-token', '1234567', 'DELETE'],
    ['session-token', '12345678', 'delete'],
  ]) {
    const { calls, deps } = setup()
    assert.equal((await deleteAccountWithCode(token, code, confirmation, deps)).ok, false)
    assert.deepEqual(calls, [])
  }
})

test('never deletes an account when the session or verified identity is invalid', async () => {
  const invalidSession = setup({ getUser: async () => null })
  assert.equal((await deleteAccountWithCode('token', '12345678', 'DELETE', invalidSession.deps)).status, 401)
  assert.deepEqual(invalidSession.calls, [])

  for (const verified of [null, { id: 'another-user' }]) {
    const mismatch = setup({ verifyCode: async () => verified })
    assert.equal((await deleteAccountWithCode('token', '12345678', 'DELETE', mismatch.deps)).status, 403)
    assert.deepEqual(mismatch.calls, ['session:token'])
  }
})

test('deletes only the bearer account after verifying a code sent to its email', async () => {
  const { calls, deps } = setup()
  const result = await deleteAccountWithCode('session-token', '12345678', 'DELETE', deps)
  assert.equal(result.ok, true)
  assert.deepEqual(calls, [
    'session:session-token',
    'code:owner@example.test:12345678',
    'delete:owner',
  ])
})

test('does not report failed or interrupted deletion as successful', async () => {
  for (const deleteUser of [async () => false, async () => { throw new Error('service unavailable') }]) {
    const { deps } = setup({ deleteUser })
    const result = await deleteAccountWithCode('token', '12345678', 'DELETE', deps)
    assert.equal(result.status, 500)
    assert.equal(result.ok, false)
  }
})
