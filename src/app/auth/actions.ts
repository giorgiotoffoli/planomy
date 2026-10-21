'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm-password') as string

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect(`/auth?message=${encodeURIComponent(error.message)}`)
  }
  redirect('/onboarding')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/auth?mode=signin&message=${encodeURIComponent(error.message)}`)
  }
  redirect('/home')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const configuredOrigin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.planomy.com'
  ).replace(
    /\/$/,
    '',
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${configuredOrigin}/auth/callback?next=/onboarding&google_signup=1`,
    },
  })

  if (error || !data.url) {
    redirect(`/auth?message=${encodeURIComponent(error?.message ?? 'Google sign-in is unavailable right now.')}`)
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error && error.message !== 'Auth session missing!') {
    throw new Error(error.message)
  }
  redirect('/auth')
}
