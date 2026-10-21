import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')
  const googleSignup = url.searchParams.get('google_signup') === '1'

  if (!code) {
    return NextResponse.redirect(new URL('/auth?message=Google sign-in was cancelled.', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/auth?message=${encodeURIComponent(error.message)}`, url.origin))
  }

  const destination = googleSignup
    ? '/onboarding?google_signup=1'
    : next === '/home'
      ? '/home'
      : '/onboarding'

  return NextResponse.redirect(new URL(destination, url.origin))
}
