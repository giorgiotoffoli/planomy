'use server'

import { deleteAccountWithPassword } from '@/lib/account-deletion'
import { consumeAccountDeletionAttempt } from '@/lib/account-deletion-rate-limit'
import { userHasAccountPassword } from '@/lib/account-password'
import { verifyAccountPassword } from '@/lib/account-password-verification'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type SettingsActionResult =
  | { ok: true; warning?: string }
  | { ok: false; message: string }

type ChangeAccountPasswordInput = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type DeleteAccountInput = {
  currentPassword: string
  confirmation: string
}

async function authenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return null
  return { supabase, user }
}

export async function changeAccountPassword(input: ChangeAccountPasswordInput): Promise<SettingsActionResult> {
  if (!input || typeof input.currentPassword !== 'string' ||
    typeof input.newPassword !== 'string' || typeof input.confirmPassword !== 'string' || !input.newPassword) {
    return { ok: false, message: 'Complete all password fields.' }
  }
  if (input.newPassword !== input.confirmPassword) return { ok: false, message: 'New passwords do not match.' }

  const authenticated = await authenticatedUser()
  if (!authenticated) return { ok: false, message: 'Your session expired. Sign in again.' }
  const hasPassword = userHasAccountPassword(authenticated.user)
  if (hasPassword && !input.currentPassword) return { ok: false, message: 'Enter your current account password.' }
  if (hasPassword && input.currentPassword === input.newPassword) {
    return { ok: false, message: 'Choose a new password that differs from your current password.' }
  }
  if (hasPassword) {
    const verification = await verifyAccountPassword(authenticated.user.email!, input.currentPassword)
    if (verification.status === 'invalid' || (verification.status === 'verified' && verification.userId !== authenticated.user.id)) {
      return { ok: false, message: 'The current account password is incorrect.' }
    }
    if (verification.status === 'rate-limited') return { ok: false, message: 'Too many password attempts. Wait a few minutes and try again.' }
    if (verification.status !== 'verified') return { ok: false, message: 'The account password could not be verified. Try again.' }
  }

  const { error } = await authenticated.supabase.auth.updateUser({
    password: input.newPassword,
    ...(hasPassword ? { current_password: input.currentPassword } : {}),
    data: { account_password_set: true },
  })
  if (error) {
    if (error.code === 'invalid_credentials') return { ok: false, message: 'The current account password is incorrect.' }
    if (error.code === 'weak_password') return { ok: false, message: 'The new password does not meet the account password requirements.' }
    if (error.code === 'same_password') return { ok: false, message: 'Choose a new password that differs from your current password.' }
    return { ok: false, message: 'The account password could not be saved. Try again.' }
  }

  try {
    const { error: signOutError } = await authenticated.supabase.auth.signOut({ scope: 'others' })
    if (signOutError) throw signOutError
    return { ok: true }
  } catch {
    return { ok: true, warning: 'Your password changed, but some other sessions could not be signed out.' }
  }
}

export async function deleteAccount(input: DeleteAccountInput): Promise<SettingsActionResult> {
  if (!input || typeof input.currentPassword !== 'string' || typeof input.confirmation !== 'string') {
    return { ok: false, message: 'Complete the deletion confirmation.' }
  }
  const authenticated = await authenticatedUser()
  if (!authenticated) return { ok: false, message: 'Your session expired. Sign in again.' }
  const { data: { session }, error: sessionError } = await authenticated.supabase.auth.getSession()
  if (sessionError || !session?.access_token) return { ok: false, message: 'Your session expired. Sign in again.' }

  try {
    const admin = createAdminClient()
    const result = await deleteAccountWithPassword(session.access_token, input.currentPassword, input.confirmation, {
      async getUser(token) {
        const { data, error } = await admin.auth.getUser(token)
        if (error || !data.user || data.user.id !== authenticated.user.id) return null
        return { id: data.user.id, email: data.user.email ?? null }
      },
      consumeAttempt: consumeAccountDeletionAttempt,
      verifyPassword: verifyAccountPassword,
      async deleteUser(userId) {
        const { error } = await admin.auth.admin.deleteUser(userId, false)
        return !error
      },
    })
    if (!result.ok) return { ok: false, message: result.message }
  } catch {
    return { ok: false, message: 'Account deletion is unavailable. Please try again later.' }
  }

  await authenticated.supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  return { ok: true }
}
