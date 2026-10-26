import { fromByteArray, toByteArray } from 'base64-js'
import type { WrappedMasterKeyPayload } from '@planomy/lib/crypto/e2ee'

const PREFIX = 'e2ee:v1'
const MASTER_KEY_BYTES = 32
const SALT_BYTES = 16
const IV_BYTES = 12
const GCM_TAG_BYTES = 16

export type VaultCryptoPrimitives = {
  deriveWrappingKey: (
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
  ) => Promise<Uint8Array>
  randomBytes: (length: number) => Promise<Uint8Array>
  aesGcmEncrypt: (
    key: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
  ) => Promise<Uint8Array>
  aesGcmDecrypt: (
    key: Uint8Array,
    iv: Uint8Array,
    ciphertextWithTag: Uint8Array,
  ) => Promise<Uint8Array>
}

function decodeBase64(value: string, label: string) {
  if (!value || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`Invalid ${label} encoding.`)
  }
  const bytes = toByteArray(value)
  if (fromByteArray(bytes) !== value) throw new Error(`Invalid ${label} encoding.`)
  return bytes
}

function validateKeychain(payload: WrappedMasterKeyPayload) {
  if (
    !payload ||
    payload.version !== 1 ||
    payload.kdf !== 'PBKDF2-SHA-256' ||
    payload.wrappingAlgorithm !== 'AES-GCM' ||
    !Number.isSafeInteger(payload.kdfIterations) ||
    payload.kdfIterations < 1
  ) {
    throw new Error('This vault uses unsupported encryption settings.')
  }

  const masterKey = decodeBase64(payload.wrappedMasterKey, 'wrapped key')
  const salt = decodeBase64(payload.wrappingKeySalt, 'key salt')
  const iv = decodeBase64(payload.wrappingKeyIv, 'key nonce')
  if (masterKey.byteLength !== MASTER_KEY_BYTES + GCM_TAG_BYTES) {
    throw new Error('The saved vault key is invalid.')
  }
  if (salt.byteLength !== SALT_BYTES || iv.byteLength !== IV_BYTES) {
    throw new Error('The saved vault key is invalid.')
  }
  return { wrappedMasterKey: masterKey, salt, iv }
}

function validMasterKey(masterKey: Uint8Array) {
  if (masterKey.byteLength !== MASTER_KEY_BYTES) {
    throw new Error('The unlocked vault key is invalid.')
  }
}

export function createE2EEProtocol(crypto: VaultCryptoPrimitives) {
  return {
    async unwrapMasterKey(password: string, payload: WrappedMasterKeyPayload) {
      if (!password) throw new Error('Enter your vault password.')
      const parts = validateKeychain(payload)
      const passwordBytes = new TextEncoder().encode(password)
      let wrappingKey: Uint8Array | null = null
      try {
        wrappingKey = await crypto.deriveWrappingKey(
          passwordBytes,
          parts.salt,
          payload.kdfIterations,
        )
        const masterKey = await crypto.aesGcmDecrypt(
          wrappingKey,
          parts.iv,
          parts.wrappedMasterKey,
        )
        if (masterKey.byteLength !== MASTER_KEY_BYTES) {
          masterKey.fill(0)
          throw new Error('The unlocked vault key is invalid.')
        }
        return masterKey
      } catch {
        throw new Error('Could not unlock the vault. Check your vault password.')
      } finally {
        passwordBytes.fill(0)
        wrappingKey?.fill(0)
        parts.salt.fill(0)
        parts.iv.fill(0)
        parts.wrappedMasterKey.fill(0)
      }
    },

    async decryptString(value: string | null | undefined, masterKey: Uint8Array) {
      if (!value) return value ?? ''
      if (!value.startsWith('e2ee:')) return value
      if (!value.startsWith(`${PREFIX}:`)) {
        throw new Error('This encrypted value uses an unsupported version.')
      }
      validMasterKey(masterKey)
      const [, version, encodedIv, encodedCiphertext] = value.split(':')
      if (version !== 'v1' || !encodedIv || !encodedCiphertext) {
        throw new Error('Invalid encrypted value format.')
      }
      const iv = decodeBase64(encodedIv, 'nonce')
      const ciphertext = decodeBase64(encodedCiphertext, 'ciphertext')
      if (iv.byteLength !== IV_BYTES || ciphertext.byteLength < GCM_TAG_BYTES) {
        throw new Error('Invalid encrypted value format.')
      }
      let plaintext: Uint8Array | null = null
      try {
        plaintext = await crypto.aesGcmDecrypt(masterKey, iv, ciphertext)
        return new TextDecoder().decode(plaintext)
      } catch {
        throw new Error('Could not decrypt this value.')
      } finally {
        plaintext?.fill(0)
        iv.fill(0)
        ciphertext.fill(0)
      }
    },

    async encryptString(value: string, masterKey: Uint8Array) {
      if (!value) return value
      validMasterKey(masterKey)
      const iv = await crypto.randomBytes(IV_BYTES)
      const plaintext = new TextEncoder().encode(value)
      let ciphertext: Uint8Array | null = null
      try {
        ciphertext = await crypto.aesGcmEncrypt(masterKey, iv, plaintext)
        if (ciphertext.byteLength < GCM_TAG_BYTES) {
          throw new Error('Encryption did not return an authentication tag.')
        }
        return `${PREFIX}:${fromByteArray(iv)}:${fromByteArray(ciphertext)}`
      } finally {
        ciphertext?.fill(0)
        iv.fill(0)
        plaintext.fill(0)
      }
    },

    disposeMasterKey(masterKey: Uint8Array) {
      masterKey.fill(0)
    },
  }
}
