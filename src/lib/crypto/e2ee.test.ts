import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createWrappedMasterKey,
  unwrapMasterKey,
  wrapMasterKey,
} from './e2ee.ts'

test('rewrapping preserves the master key and rotates wrapping material', async () => {
  const original = await createWrappedMasterKey('original-password')
  const replacement = await wrapMasterKey(
    original.masterKey,
    'replacement-password',
  )
  const unwrapped = await unwrapMasterKey('replacement-password', replacement)

  assert.deepEqual(unwrapped, original.masterKey)
  assert.notEqual(
    replacement.wrappedMasterKey,
    original.payload.wrappedMasterKey,
  )
  assert.notEqual(replacement.wrappingKeySalt, original.payload.wrappingKeySalt)
  assert.notEqual(replacement.wrappingKeyIv, original.payload.wrappingKeyIv)
})

test('the old password cannot unlock a rewrapped master key', async () => {
  const original = await createWrappedMasterKey('original-password')
  const replacement = await wrapMasterKey(
    original.masterKey,
    'replacement-password',
  )

  await assert.rejects(
    unwrapMasterKey('original-password', replacement),
    /Could not unlock master key/,
  )
})

test('master passwords shorter than twelve characters are rejected', async () => {
  const masterKey = new Uint8Array(32)
  await assert.rejects(
    wrapMasterKey(masterKey, 'too-short'),
    /at least 12 characters/,
  )
})

test('only 256-bit master keys can be wrapped', async () => {
  await assert.rejects(
    wrapMasterKey(new Uint8Array(16), 'long-enough-password'),
    /must be 32 bytes/,
  )
})
