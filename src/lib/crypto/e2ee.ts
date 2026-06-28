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

export async function createWrappedMasterKey(masterPassword: string): Promise<{
  masterKey: Uint8Array
  payload: WrappedMasterKeyPayload
}> {
  if (masterPassword.length < 12) {
    throw new Error('Master password must be at least 12 characters.')
  }

  const masterKey = randomBytes(MASTER_KEY_BYTES)
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(AES_GCM_IV_BYTES)

  const wrappingKey = await deriveWrappingKey(masterPassword, salt)

  const wrappedMasterKey = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    wrappingKey,
    toArrayBuffer(masterKey),
  )

  return {
    masterKey,
    payload: {
      wrappedMasterKey: bytesToBase64(new Uint8Array(wrappedMasterKey)),
      wrappingKeySalt: bytesToBase64(salt),
      wrappingKeyIv: bytesToBase64(iv),
      kdf: 'PBKDF2-SHA-256',
      kdfIterations: DEFAULT_KDF_ITERATIONS,
      wrappingAlgorithm: 'AES-GCM',
      version: KEYCHAIN_VERSION,
    },
  }
}

export async function unwrapMasterKey(
  masterPassword: string,
  payload: WrappedMasterKeyPayload,
) {
  const salt = base64ToBytes(payload.wrappingKeySalt)
  const iv = base64ToBytes(payload.wrappingKeyIv)
  const wrappedMasterKey = base64ToBytes(payload.wrappedMasterKey)

  const wrappingKey = await deriveWrappingKey(
    masterPassword,
    salt,
    payload.kdfIterations,
  )

  try {
    const masterKey = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      wrappingKey,
      toArrayBuffer(wrappedMasterKey),
    )

    return new Uint8Array(masterKey)
  } catch {
    throw new Error('Could not unlock master key. Check the master password.')
  }
}
