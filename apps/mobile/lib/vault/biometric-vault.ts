import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { createBiometricStore } from './biometric-store'

const protectedOptions: SecureStore.SecureStoreOptions = {
  keychainService: 'planomy.biometric-vault.v1',
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  requireAuthentication: true,
  authenticationPrompt: 'Unlock your Planomy vault',
}
const markerOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

function secretKey(userId: string) { return `planomy.biometric.v1.${userId}` }
function markerKey(userId: string) { return `planomy.biometric.enabled.v1.${userId}` }

export function biometricVaultAvailable() {
  if (Platform.OS !== 'ios' || Constants.appOwnership === 'expo') return false
  try { return SecureStore.canUseBiometricAuthentication() } catch { return false }
}

const store = createBiometricStore({
  available: biometricVaultAvailable,
  readSecret: (userId) => SecureStore.getItemAsync(secretKey(userId), protectedOptions),
  writeSecret: (userId, value) => SecureStore.setItemAsync(secretKey(userId), value, protectedOptions),
  deleteSecret: (userId) => SecureStore.deleteItemAsync(secretKey(userId), protectedOptions),
  readMarker: (userId) => SecureStore.getItemAsync(markerKey(userId), markerOptions),
  writeMarker: (userId) => SecureStore.setItemAsync(markerKey(userId), '1', markerOptions),
  deleteMarker: (userId) => SecureStore.deleteItemAsync(markerKey(userId), markerOptions),
})

export function isBiometricVaultEnabled(userId: string) {
  return Platform.OS === 'ios' ? store.isEnabled(userId) : Promise.resolve(false)
}

export function removeBiometricVault(userId: string) {
  return Platform.OS === 'ios' ? store.remove(userId) : Promise.resolve()
}

export const enableBiometricVault = store.enable
export const readBiometricVault = store.read
