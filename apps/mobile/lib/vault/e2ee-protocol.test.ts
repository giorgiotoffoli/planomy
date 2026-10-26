import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { test } from 'node:test'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { fromByteArray } from 'base64-js'
import { createE2EEProtocol, type VaultCryptoPrimitives } from './e2ee-protocol.ts'

const subtle = webcrypto.subtle

const webCryptoPrimitives: VaultCryptoPrimitives = {
  async deriveWrappingKey(password, salt, iterations) {
    const key = await subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits'])
    return new Uint8Array(await subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256,
    ))
  },
  async randomBytes(length) {
    return webcrypto.getRandomValues(new Uint8Array(length))
  },
  async aesGcmEncrypt(keyBytes, iv, plaintext) {
    const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt'])
    return new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext))
  },
  async aesGcmDecrypt(keyBytes, iv, ciphertextWithTag) {
    const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextWithTag))
  },
}

async function webFixture() {
  const password = 'correct horse battery staple'
  const masterKey = Uint8Array.from({ length: 32 }, (_, index) => index + 1)
  const salt = Uint8Array.from({ length: 16 }, (_, index) => 255 - index)
  const wrappingIv = Uint8Array.from({ length: 12 }, (_, index) => index + 4)
  const wrappingKey = await webCryptoPrimitives.deriveWrappingKey(
    new TextEncoder().encode(password),
    salt,
    310_000,
  )
  const wrappedMasterKey = await webCryptoPrimitives.aesGcmEncrypt(
    wrappingKey,
    wrappingIv,
    masterKey,
  )
  const payload = {
    wrappedMasterKey: fromByteArray(wrappedMasterKey),
    wrappingKeySalt: fromByteArray(salt),
    wrappingKeyIv: fromByteArray(wrappingIv),
    kdf: 'PBKDF2-SHA-256' as const,
    kdfIterations: 310_000,
    wrappingAlgorithm: 'AES-GCM' as const,
    version: 1 as const,
  }
  const valueIv = Uint8Array.from({ length: 12 }, (_, index) => 42 + index)
  const valueCiphertext = await webCryptoPrimitives.aesGcmEncrypt(
    masterKey,
    valueIv,
    new TextEncoder().encode('Web task: prepare the launch notes 🪴'),
  )
  return {
    password,
    masterKey,
    payload,
    encryptedValue: `e2ee:v1:${fromByteArray(valueIv)}:${fromByteArray(valueCiphertext)}`,
  }
}

test('native protocol reads the existing Web Crypto keychain and task cipher format', async () => {
  const fixture = await webFixture()
  const protocol = createE2EEProtocol(webCryptoPrimitives)

  const unwrapped = await protocol.unwrapMasterKey(fixture.password, fixture.payload)
  assert.deepEqual(unwrapped, fixture.masterKey)
  assert.equal(
    await protocol.decryptString(fixture.encryptedValue, unwrapped),
    'Web task: prepare the launch notes 🪴',
  )

  const mobileEncrypted = await protocol.encryptString('Saved from mobile', unwrapped)
  assert.match(mobileEncrypted, /^e2ee:v1:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/)
  assert.equal(
    await protocol.decryptString(mobileEncrypted, fixture.masterKey),
    'Saved from mobile',
  )
})

test('PBKDF2-SHA-256 from the mobile KDF matches Web Crypto at the stored work factor', async () => {
  const password = new TextEncoder().encode('one existing Planomy vault password')
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index * 7)
  const webKey = await webCryptoPrimitives.deriveWrappingKey(password, salt, 310_000)
  const mobileKey = await pbkdf2Async(sha256, password, salt, {
    c: 310_000,
    dkLen: 32,
  })
  assert.deepEqual(mobileKey, webKey)
})

test('wrong password, modified ciphertext, and unsupported versions fail closed', async () => {
  const fixture = await webFixture()
  const protocol = createE2EEProtocol(webCryptoPrimitives)
  await assert.rejects(
    () => protocol.unwrapMasterKey('wrong password', fixture.payload),
    /Could not unlock the vault/,
  )
  const masterKey = await protocol.unwrapMasterKey(fixture.password, fixture.payload)
  const changed = fixture.encryptedValue.replace(/.$/, 'A')
  await assert.rejects(() => protocol.decryptString(changed, masterKey))
  await assert.rejects(
    () => protocol.decryptString('e2ee:v2:AAAA:BBBB', masterKey),
    /unsupported version/,
  )
})

test('empty values and legacy plaintext keep the web app semantics', async () => {
  const protocol = createE2EEProtocol(webCryptoPrimitives)
  const key = new Uint8Array(32)
  assert.equal(await protocol.encryptString('', key), '')
  assert.equal(await protocol.decryptString('', key), '')
  assert.equal(await protocol.decryptString('legacy clear value', key), 'legacy clear value')
})
