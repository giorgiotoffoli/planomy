import * as Crypto from 'expo-crypto'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { createE2EEProtocol } from './e2ee-protocol'

const AES_KEY_BYTES = 32
const GCM_TAG_BYTES = 16

export const nativeE2EE = createE2EEProtocol({
  async deriveWrappingKey(password, salt, iterations) {
    return pbkdf2Async(sha256, password, salt, {
      c: iterations,
      dkLen: AES_KEY_BYTES,
    })
  },
  randomBytes: (length) => Crypto.getRandomBytesAsync(length),
  async aesGcmEncrypt(keyBytes, iv, plaintext) {
    const key = await Crypto.AESEncryptionKey.import(keyBytes)
    const sealed = await Crypto.aesEncryptAsync(plaintext, key, {
      nonce: { bytes: iv },
      tagLength: GCM_TAG_BYTES,
    })
    return sealed.ciphertext({ encoding: 'bytes', includeTag: true }) as Promise<Uint8Array>
  },
  async aesGcmDecrypt(keyBytes, iv, ciphertextWithTag) {
    const key = await Crypto.AESEncryptionKey.import(keyBytes)
    const sealed = Crypto.AESSealedData.fromParts(iv, ciphertextWithTag, GCM_TAG_BYTES)
    return Crypto.aesDecryptAsync(sealed, key, { output: 'bytes' }) as Promise<Uint8Array>
  },
})
