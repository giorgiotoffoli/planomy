/** Server-side account deletion; callers must supply an authenticated token and a fresh email code. */
export type DeleteAccountDependencies = {
  getUser: (token: string) => Promise<{ id: string; email?: string | null } | null>
  verifyCode: (email: string, code: string) => Promise<{ id: string } | null>
  deleteUser: (userId: string) => Promise<boolean>
}

export type DeleteAccountResult = { status: number; message: string; ok: boolean }

export async function deleteAccountWithCode(
  token: string,
  code: string,
  confirmation: string,
  deps: DeleteAccountDependencies,
): Promise<DeleteAccountResult> {
  if (!token) return { status: 401, ok: false, message: 'Your session expired. Sign in again.' }
  if (!/^\d{8}$/.test(code) || confirmation !== 'DELETE') {
    return { status: 400, ok: false, message: 'Enter the 8-digit code and type DELETE to confirm.' }
  }
  try {
    const user = await deps.getUser(token)
    if (!user?.email) return { status: 401, ok: false, message: 'Your session expired. Sign in again.' }
    const verified = await deps.verifyCode(user.email, code)
    if (!verified || verified.id !== user.id) {
      return { status: 403, ok: false, message: 'The confirmation code is invalid or expired. Request a new code and try again.' }
    }
    if (!await deps.deleteUser(user.id)) {
      return { status: 500, ok: false, message: 'The account could not be deleted. Please try again.' }
    }
    return { status: 200, ok: true, message: 'Account deleted.' }
  } catch {
    return { status: 500, ok: false, message: 'The account could not be deleted. Please try again.' }
  }
}
