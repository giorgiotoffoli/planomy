export const KEYCHAIN_VERSION = 1
export const DEFAULT_KDF_ITERATIONS = 310_000

const MASTER_KEY_BYTES = 32
const SALT_BYTES = 16
const AES_GCM_IV_BYTES = 12

export type WrappedMasterKeyPayload = {
  wrappedMasterKey: string
  wrappingKeySalt: string
  wrappingKeyIv: string
  kdf: 'PBKDF2-SHA-256'
  kdfIterations: number
  wrappingAlgorithm: 'AES-GCM'
  version: 1
}

// Checks if browser supports Web Cyrpto API
function assertBrowserCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is not available in this environment.')
  }
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

// Used to generate random master key, salt, and IV
function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function deriveWrappingKey(
  masterPassword: string,
  salt: Uint8Array,
  iterations = DEFAULT_KDF_ITERATIONS,
) {
  assertBrowserCrypto()

  // Turns user password into bytes
  const passwordBytes = new TextEncoder().encode(masterPassword)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}
