import 'react-native-url-polyfill/auto'

import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import type { Database } from '@planomy/lib/supabase/database-types'
import {
  AUTH_STORAGE_KEY,
  createSecureSessionStorage,
} from '@/lib/auth/secure-session-storage'

// Supabase's PKCE implementation needs secure random values and SHA-256.
// Hermes may expose neither Web Crypto primitive; use Expo's native module.
if (Platform.OS !== 'web') {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true })
  }
  if (typeof globalThis.crypto.getRandomValues !== 'function') {
    Object.defineProperty(globalThis.crypto, 'getRandomValues', { value: Crypto.getRandomValues, configurable: true })
  }
  if (!globalThis.crypto.subtle) {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: {
        digest: (algorithm: AlgorithmIdentifier, data: BufferSource) => {
          const name = typeof algorithm === 'string' ? algorithm : algorithm.name
          if (name.toUpperCase() !== 'SHA-256') throw new Error('Unsupported digest algorithm.')
          return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data)
        },
      },
      configurable: true,
    })
  }
}

export const nativeSessionStorage = createSecureSessionStorage({
  getItemAsync: (key) => SecureStore.getItemAsync(key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
})

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

export let nativeSupabaseConfigurationError: string | null = null
export let nativeSupabaseClient: SupabaseClient<Database> | null = null

if (Platform.OS === 'web') {
  nativeSupabaseConfigurationError = 'Native sign-in is available in the iOS and Android apps.'
} else if (!supabaseUrl || !supabasePublishableKey) {
  nativeSupabaseConfigurationError =
    'Add the public Supabase URL and publishable key to apps/mobile/.env.local.'
} else {
  try {
    nativeSupabaseClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
        storage: nativeSessionStorage,
        storageKey: AUTH_STORAGE_KEY,
      },
    })
  } catch {
    nativeSupabaseConfigurationError = 'The public Supabase configuration is invalid.'
  }
}
