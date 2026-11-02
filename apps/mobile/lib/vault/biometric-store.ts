import type { WrappedMasterKeyPayload } from '@planomy/lib/crypto/e2ee'
import { decodeBiometricRecord, encodeBiometricRecord } from './biometric-record.ts'

export type BiometricStorage = {
  available: () => boolean
  readSecret: (userId: string) => Promise<string | null>
  writeSecret: (userId: string, value: string) => Promise<void>
  deleteSecret: (userId: string) => Promise<void>
  readMarker: (userId: string) => Promise<string | null>
  writeMarker: (userId: string) => Promise<void>
  deleteMarker: (userId: string) => Promise<void>
}

export function createBiometricStore(storage: BiometricStorage) {
  async function remove(userId: string) {
    await storage.deleteSecret(userId)
    await storage.deleteMarker(userId)
  }

  return {
    remove,
    async isEnabled(userId: string) {
      return (await storage.readMarker(userId)) === '1'
    },
    async enable(userId: string, masterKey: Uint8Array, keychain: WrappedMasterKeyPayload) {
      if (!storage.available()) throw new Error('Face ID or Touch ID is not available on this device.')
      const value = encodeBiometricRecord(userId, masterKey, keychain)
      try {
        await storage.writeSecret(userId, value)
        // Creating an iOS Keychain item does not prompt. Confirm the protected
        // read before saving the marker that makes biometric unlock available.
        if (await storage.readSecret(userId) !== value) throw new Error('Biometric verification did not complete.')
        await storage.writeMarker(userId)
      } catch {
        await remove(userId).catch(() => {})
        throw new Error('Could not enable Face ID or Touch ID. Try again or unlock with your vault password.')
      }
    },
    async read(userId: string, keychain: WrappedMasterKeyPayload) {
      if (!storage.available()) throw new Error('Face ID or Touch ID is unavailable. Use your vault password.')
      let value: string | null
      try {
        value = await storage.readSecret(userId)
      } catch {
        throw new Error('Face ID or Touch ID did not complete. Try again or use your vault password.')
      }
      if (!value) {
        await remove(userId).catch(() => {})
        throw new Error('Biometric settings changed. Unlock with your vault password and set up Face ID again.')
      }
      try {
        return decodeBiometricRecord(value, userId, keychain)
      } catch {
        await remove(userId).catch(() => {})
        throw new Error('Your vault settings changed. Unlock with your vault password and set up Face ID again.')
      }
    },
  }
}
