export type AppleSignInCredential = {
  identityToken: string
  nonce: string
}

export async function getAppleSignInCredential(): Promise<AppleSignInCredential> {
  throw new Error('Sign in with Apple is available on iPhone and iPad.')
}

export function isAppleSignInCanceled(_error: unknown) {
  return false
}
