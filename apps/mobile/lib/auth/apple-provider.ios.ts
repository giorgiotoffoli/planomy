import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'

export type AppleSignInCredential = {
  identityToken: string
  nonce: string
}

export async function getAppleSignInCredential(): Promise<AppleSignInCredential> {
  const nonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  )
  const credential = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
  })

  if (!credential.identityToken) throw new Error('Apple did not return an identity token.')
  return { identityToken: credential.identityToken, nonce }
}

export function isAppleSignInCanceled(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ERR_REQUEST_CANCELED',
  )
}
