import assert from 'node:assert/strict'
import test from 'node:test'
import { userHasAccountPassword } from './account-password.ts'

test('uses the explicit Planomy password marker, not the email identity provider', () => {
  const passwordlessEmailUser = {
    app_metadata: { providers: ['email'] },
    user_metadata: {},
  }
  const googleUser = {
    app_metadata: { providers: ['google'] },
    user_metadata: {},
  }
  assert.equal(userHasAccountPassword(passwordlessEmailUser), false)
  assert.equal(userHasAccountPassword(googleUser), false)
  assert.equal(
    userHasAccountPassword({
      user_metadata: { account_password_set: false },
    }),
    false,
  )
  assert.equal(userHasAccountPassword({}), false)
  assert.equal(
    userHasAccountPassword({
      user_metadata: { account_password_set: true },
    }),
    true,
  )
})
