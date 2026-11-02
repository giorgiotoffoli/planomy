import { fromByteArray, toByteArray } from 'base64-js'
import type { WrappedMasterKeyPayload } from '@planomy/lib/crypto/e2ee'

export function encodeBiometricRecord(userId: string, masterKey: Uint8Array, keychain: WrappedMasterKeyPayload) {
  if (masterKey.length !== 32) throw new Error('The unlocked vault key is invalid.')
  return JSON.stringify({ version: 1, userId, keychain, key: fromByteArray(masterKey) })
}

export function decodeBiometricRecord(value: string, userId: string, keychain: WrappedMasterKeyPayload) {
  const record = JSON.parse(value) as { version?: unknown; userId?: unknown; keychain?: unknown; key?: unknown }
  if (record.version !== 1 || record.userId !== userId || JSON.stringify(record.keychain) !== JSON.stringify(keychain) ||
    typeof record.key !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(record.key)) {
    throw new Error('Invalid biometric key')
  }
  const key = toByteArray(record.key)
  if (key.length !== 32 || fromByteArray(key) !== record.key) {
    key.fill(0)
    throw new Error('Invalid biometric key')
  }
  return key
}
