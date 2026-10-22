export type AuthFlow = 'password' | 'otp-request' | 'otp-verify'
export const OTP_LENGTH = 8

export function authErrorMessage(error: unknown, flow: AuthFlow) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : ''
  const normalized = message.toLowerCase()

  if (
    normalized.includes('network request failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('offline')
  ) {
    return 'Could not connect. Check your internet connection and try again.'
  }
  if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
    return 'Too many attempts. Wait a moment, then try again.'
  }
  if (flow === 'password' && (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid_credentials')
  )) {
    return 'That email and password do not match an account.'
  }
  if (flow === 'password' && normalized.includes('email not confirmed')) {
    return 'Confirm your email before signing in.'
  }
  if (flow === 'otp-verify' && normalized.includes('expired')) {
    return 'That code has expired. Request a new code and try again.'
  }
  if (flow === 'otp-verify' && (
    normalized.includes('invalid') ||
    normalized.includes('token') ||
    normalized.includes('otp')
  )) {
    return 'That code is incorrect or expired. Check it or request a new one.'
  }
  if (flow === 'otp-request') {
    return 'Could not send a code to that address. Check it and try again.'
  }
  return 'Sign-in could not complete. Please try again.'
}
