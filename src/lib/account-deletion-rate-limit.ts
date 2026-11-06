import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type AccountDeletionRateLimit = {
  allowed: boolean
  retryAfterSeconds: number
}

export async function consumeAccountDeletionAttempt(
  userId: string,
): Promise<AccountDeletionRateLimit> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc(
    'consume_account_deletion_attempt',
    { p_user_id: userId },
  )

  if (error) throw new Error('Could not check account deletion attempts.')
  const result = data?.[0]
  if (!result) throw new Error('Account deletion rate limit returned no result.')

  return {
    allowed: result.allowed,
    retryAfterSeconds: Math.max(0, result.retry_after_seconds),
  }
}
