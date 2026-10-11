'use server'

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) return null
  return { supabase, user, email: user.email }
}

async function verifyPassword(
  email: string,
  password: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error
}

function passwordVerificationMessage(error: { code?: string }) {
  return error.code === 'invalid_credentials'
    ? 'The current account password is incorrect.'
    : 'The account password could not be verified. Try again.'
}

function passwordUpdateMessage(error: { code?: string }) {
  if (error.code === 'weak_password') {
    return 'The new password does not meet the account password requirements.'
  }

  if (error.code === 'same_password') {
    return 'Choose a new password that differs from your current password.'
  }

  return 'The account password could not be changed.'
}

export async function changeAccountPassword(
  input: ChangeAccountPasswordInput,
): Promise<SettingsActionResult> {
  if (
    !input ||
    typeof input.currentPassword !== 'string' ||
    typeof input.newPassword !== 'string' ||
    typeof input.confirmPassword !== 'string' ||
    !input.currentPassword ||
    !input.newPassword
  ) {
    return { ok: false, message: 'Complete all password fields.' }
  }

  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, message: 'New passwords do not match.' }
  }

  if (input.currentPassword === input.newPassword) {
    return {
      ok: false,
      message: 'Choose a new password that differs from your current password.',
    }
  }

  const authenticated = await authenticatedUser()
  if (!authenticated) {
    return { ok: false, message: 'Your session expired. Sign in again.' }
  }

  const verificationError = await verifyPassword(
    authenticated.email,
    input.currentPassword,
    authenticated.supabase,
  )
  if (verificationError) {
    return {
      ok: false,
      message: passwordVerificationMessage(verificationError),
    }
  }

  const { error } = await authenticated.supabase.auth.updateUser({
    password: input.newPassword,
    current_password: input.currentPassword,
  })
  if (error) return { ok: false, message: passwordUpdateMessage(error) }

  const { error: signOutError } = await authenticated.supabase.auth.signOut({
    scope: 'others',
  })

  return signOutError
    ? {
        ok: true,
        warning:
          'Your password changed, but some other sessions could not be signed out.',
      }
    : { ok: true }
}

export async function deleteAccount(
  input: DeleteAccountInput,
): Promise<SettingsActionResult> {
  if (
    !input ||
    typeof input.currentPassword !== 'string' ||
    typeof input.confirmation !== 'string'
  ) {
    return { ok: false, message: 'Complete the deletion confirmation.' }
  }

  if (input.confirmation !== 'DELETE') {
    return { ok: false, message: 'Type DELETE exactly to confirm.' }
  }

  if (!input.currentPassword) {
    return { ok: false, message: 'Enter your current account password.' }
  }

  const authenticated = await authenticatedUser()
  if (!authenticated) {
    return { ok: false, message: 'Your session expired. Sign in again.' }
  }

  const verificationError = await verifyPassword(
    authenticated.email,
    input.currentPassword,
    authenticated.supabase,
  )
  if (verificationError) {
    return {
      ok: false,
      message: passwordVerificationMessage(verificationError),
    }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(
      authenticated.user.id,
      false,
    )
    if (error) {
      return { ok: false, message: 'The account could not be deleted.' }
    }
  } catch {
    return { ok: false, message: 'The account could not be deleted.' }
  }

  // Deleting the Auth user invalidates the refresh session. This local sign-out
  // also asks the SSR client to remove its cookies; a hard navigation follows.
  await authenticated.supabase.auth.signOut({ scope: 'local' }).catch(() => {})

  return { ok: true }
}
