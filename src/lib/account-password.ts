export type AccountPasswordUser = {
  user_metadata?: Record<string, unknown> | null
}

export function userHasAccountPassword(user: AccountPasswordUser): boolean {
  return user.user_metadata?.account_password_set === true
}
