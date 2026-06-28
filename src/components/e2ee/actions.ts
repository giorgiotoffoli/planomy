'use server'

import type { WrappedMasterKeyPayload } from '@/lib/crypto/e2ee'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type StoredKeychain = WrappedMasterKeyPayload

async function getAuthenticatedUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return { supabase, user }
}

export async function getUserKeychain(): Promise<StoredKeychain | null> {
  const { supabase, user } = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('user_keychain')
    .select(
      'wrapped_master_key, wrapping_key_salt, wrapping_key_iv, kdf, kdf_iterations, wrapping_algorithm, version',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return {
    wrappedMasterKey: data.wrapped_master_key,
    wrappingKeySalt: data.wrapping_key_salt,
    wrappingKeyIv: data.wrapping_key_iv,
    kdf: data.kdf as StoredKeychain['kdf'],
    kdfIterations: data.kdf_iterations,
    wrappingAlgorithm:
      data.wrapping_algorithm as StoredKeychain['wrappingAlgorithm'],
    version: data.version as StoredKeychain['version'],
  }
}

export async function saveUserKeychain(payload: StoredKeychain) {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase.from('user_keychain').upsert(
    {
      user_id: user.id,
      wrapped_master_key: payload.wrappedMasterKey,
      wrapping_key_salt: payload.wrappingKeySalt,
      wrapping_key_iv: payload.wrappingKeyIv,
      kdf: payload.kdf,
      kdf_iterations: payload.kdfIterations,
      wrapping_algorithm: payload.wrappingAlgorithm,
      version: payload.version,
    },
    {
      onConflict: 'user_id',
    },
  )

  if (error) {
    throw new Error(error.message)
  }
}
