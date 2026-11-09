import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database-types'

export type AccountPasswordVerification =
  | { status: 'verified'; userId: string }
  | { status: 'invalid' }
  | { status: 'rate-limited' }
  | { status: 'unavailable' }

export async function verifyAccountPassword(
  email: string,
  password: string,
): Promise<AccountPasswordVerification> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return { status: 'unavailable' }

  const verifier = createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  try {
    const { data, error } = await verifier.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.status === 429 || error.code === 'over_request_rate_limit') return { status: 'rate-limited' }
      return error.code === 'invalid_credentials' ? { status: 'invalid' } : { status: 'unavailable' }
    }

    if (!data.session || !data.user?.id) return { status: 'invalid' }

    const userId = data.user.id
    const { error: signOutError } = await verifier.auth.signOut({ scope: 'local' })
    if (signOutError) return { status: 'unavailable' }

    return { status: 'verified', userId }
  } catch {
    return { status: 'unavailable' }
  }
}
