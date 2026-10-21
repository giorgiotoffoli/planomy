import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/auth?message=Google sign-in was cancelled.', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/auth?message=${encodeURIComponent(error.message)}`, url.origin))
  }

  return NextResponse.redirect(new URL(next === '/home' ? '/home' : '/onboarding', url.origin))
}
