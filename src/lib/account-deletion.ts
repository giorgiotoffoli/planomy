export type DeletionUser = { id: string; email: string | null }

export type PasswordVerification =
  | { status: 'verified'; userId: string }
  | { status: 'invalid' }
  | { status: 'rate-limited' }
  | { status: 'unavailable' }

export type DeleteAccountDependencies = {
  getUser: (token: string) => Promise<DeletionUser | null>
  consumeAttempt: (userId: string) => Promise<{
    allowed: boolean
    retryAfterSeconds: number
  }>
  verifyPassword: (
    email: string,
    password: string,
  ) => Promise<PasswordVerification>
  deleteUser: (userId: string) => Promise<boolean>
}

export type DeleteAccountResult = {
  ok: boolean
  status: number
  message: string
  retryAfterSeconds?: number
}

export async function deleteAccountWithPassword(
  token: string,
  password: string,
  confirmation: string,
  deps: DeleteAccountDependencies,
): Promise<DeleteAccountResult> {
  if (!token) return { ok: false, status: 401, message: 'Your session expired. Sign in again.' }
  if (!password) return { ok: false, status: 400, message: 'Enter your current account password.' }
  if (confirmation !== 'DELETE') {
    return { ok: false, status: 400, message: 'Type DELETE exactly to confirm.' }
  }

  let user: DeletionUser | null
  try {
    user = await deps.getUser(token)
  } catch {
    user = null
  }
  if (!user?.id || !user.email) {
    return { ok: false, status: 401, message: 'Your session expired. Sign in again.' }
  }

  let limit: { allowed: boolean; retryAfterSeconds: number }
  try {
    limit = await deps.consumeAttempt(user.id)
  } catch {
    return { ok: false, status: 503, message: 'Account deletion is unavailable. Please try again later.' }
  }
  if (!limit.allowed) {
    const retryAfterSeconds = Math.max(1, limit.retryAfterSeconds)
    return {
      ok: false,
      status: 429,
      message: 'Too many password attempts. Wait a few minutes and try again.',
      retryAfterSeconds,
    }
  }

  let verification: PasswordVerification
  try {
    verification = await deps.verifyPassword(user.email, password)
  } catch {
    verification = { status: 'unavailable' }
  }
  if (verification.status === 'rate-limited') {
    return {
      ok: false,
      status: 429,
      message: 'Too many password attempts. Wait a few minutes and try again.',
      retryAfterSeconds: 900,
    }
  }
  if (verification.status === 'unavailable') {
    return { ok: false, status: 503, message: 'The account password could not be verified. Try again.' }
  }
  if (verification.status === 'invalid') {
    return {
      ok: false,
      status: 403,
      message: 'The account password is incorrect. If you have not set one, create an account password in Settings first.',
    }
  }
  if (verification.userId !== user.id) {
    return { ok: false, status: 403, message: 'The account password could not be verified for this account.' }
  }

  try {
    if (!(await deps.deleteUser(user.id))) {
      return { ok: false, status: 500, message: 'The account could not be deleted.' }
    }
  } catch {
    return { ok: false, status: 500, message: 'The account could not be deleted.' }
  }

  return { ok: true, status: 200, message: 'Your account was deleted.' }
}
