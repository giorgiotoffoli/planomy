import assert from 'node:assert/strict'
import test from 'node:test'
import type { WrappedMasterKeyPayload } from '@planomy/lib/crypto/e2ee'
import { createBiometricStore, type BiometricStorage } from './biometric-store.ts'

const keychain: WrappedMasterKeyPayload = {
  wrappedMasterKey: 'wrapped', wrappingKeySalt: 'salt', wrappingKeyIv: 'iv',
  kdf: 'PBKDF2-SHA-256', kdfIterations: 310000, wrappingAlgorithm: 'AES-GCM', version: 1,
}

function fixture() {
  const secrets = new Map<string, string>()
  const markers = new Map<string, string>()
  let rejectRead = false
  let rejectDelete = false
  const storage: BiometricStorage = {
    available: () => true,
    readSecret: async (id) => {
      if (rejectRead) throw new Error('cancelled')
      return secrets.get(id) ?? null
    },
    writeSecret: async (id, value) => { secrets.set(id, value) },
    deleteSecret: async (id) => {
      if (rejectDelete) throw new Error('delete failed')
      secrets.delete(id)
    },
    readMarker: async (id) => markers.get(id) ?? null,
    writeMarker: async (id) => { markers.set(id, '1') },
    deleteMarker: async (id) => { markers.delete(id) },
  }
  return {
    store: createBiometricStore(storage), secrets, markers,
    rejectRead: (value: boolean) => { rejectRead = value },
    rejectDelete: (value: boolean) => { rejectDelete = value },
  }
}

test('enrollment only marks biometrics enabled after a verified protected read', async () => {
  const { store, secrets, markers, rejectRead } = fixture()
  rejectRead(true)
  await assert.rejects(store.enable('user', new Uint8Array(32), keychain))
  assert.equal(secrets.has('user'), false)
  assert.equal(markers.has('user'), false)
  rejectRead(false)
  await store.enable('user', new Uint8Array(32), keychain)
  assert.equal(await store.isEnabled('user'), true)
  assert.deepEqual(await store.read('user', keychain), new Uint8Array(32))
})

test('a cancelled prompt preserves enrollment, while a changed keychain removes it', async () => {
  const { store, secrets, markers, rejectRead } = fixture()
  await store.enable('user', new Uint8Array(32), keychain)
  rejectRead(true)
  await assert.rejects(store.read('user', keychain))
  assert.equal(await store.isEnabled('user'), true)
  rejectRead(false)
  await assert.rejects(store.read('user', { ...keychain, wrappedMasterKey: 'new' }))
  assert.equal(secrets.has('user'), false)
  assert.equal(markers.has('user'), false)
})

test('failed secret deletion is reported so sign-out can retry', async () => {
  const { store, markers, rejectDelete } = fixture()
  await store.enable('user', new Uint8Array(32), keychain)
  rejectDelete(true)
  await assert.rejects(store.remove('user'))
  assert.equal(markers.has('user'), true)
})
