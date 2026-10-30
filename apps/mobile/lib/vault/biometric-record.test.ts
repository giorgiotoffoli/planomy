import assert from 'node:assert/strict'
import test from 'node:test'
import type { WrappedMasterKeyPayload } from '@planomy/lib/crypto/e2ee'
import { decodeBiometricRecord, encodeBiometricRecord } from './biometric-record.ts'

const keychain: WrappedMasterKeyPayload = {
  wrappedMasterKey: 'wrapped',
  wrappingKeySalt: 'salt',
  wrappingKeyIv: 'iv',
  kdf: 'PBKDF2-SHA-256',
  kdfIterations: 310000,
  wrappingAlgorithm: 'AES-GCM',
  version: 1,
}

test('biometric record restores only the matching account and current keychain', () => {
  const key = Uint8Array.from({ length: 32 }, (_, index) => index)
  const record = encodeBiometricRecord('account-a', key, keychain)
  assert.deepEqual(decodeBiometricRecord(record, 'account-a', keychain), key)
  assert.throws(() => decodeBiometricRecord(record, 'account-b', keychain))
  assert.throws(() => decodeBiometricRecord(record, 'account-a', { ...keychain, wrappedMasterKey: 'rotated' }))
  key.fill(0)
})

test('biometric records reject malformed or unsupported keys', () => {
  assert.throws(() => encodeBiometricRecord('account-a', new Uint8Array(31), keychain))
  const record = encodeBiometricRecord('account-a', new Uint8Array(32), keychain)
  assert.throws(() => decodeBiometricRecord('{', 'account-a', keychain))
  assert.throws(() => decodeBiometricRecord(record.replace('"version":1', '"version":2'), 'account-a', keychain))
  const invalid = JSON.stringify({ ...JSON.parse(record), key: 'A'.repeat(43) + 'B' })
  assert.throws(() => decodeBiometricRecord(invalid, 'account-a', keychain))
})
