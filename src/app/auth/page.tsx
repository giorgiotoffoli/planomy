'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import './auth.css'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { MotionConfig, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Lock, Mail, RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import GlassBackground from '@/components/auth/glass-background'
import { PlanomyIcon } from '@/icons/planomy-icon'
import { useIsMobile } from '@/hooks/use-mobile'
import { createClient } from '@/lib/supabase/client'
import { signInWithGoogle, signUp } from './actions'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

const PyramidScene = dynamic(() => import('@/components/auth/pyramid-scene'), { ssr: false })

const OTP_LENGTH = 8
const OTP_RESEND_COOLDOWN_SECONDS = 60

type AuthStep = 'email' | 'verification'
type SignupStep = 'choice' | 'form'
type OtpAction = 'request' | 'verify'

type AuthErrorLike = {
  message?: string
  status?: number
}

function getOtpErrorMessage(error: AuthErrorLike, action: OtpAction) {
  const message = error.message?.toLowerCase() ?? ''

  if (
    error.status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many') ||
    message.includes('60 seconds')
  ) {
    return 'Too many attempts. Please wait a minute before trying again.'
  }

  if (action === 'verify') {
    return 'That code is invalid or has expired. Request a new code and try again.'
  }

  return 'We could not send a code right now. Check your email address and try again.'
}

function SignupSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!pending || isMobile) return

    const toastId = toast('Creating your account…', { position: 'top-center' })
    return () => {
      toast.dismiss(toastId)
    }
  }, [isMobile, pending])

  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className="h-auto w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-none hover:bg-primary/90"
    >
      <span role="status" aria-live="polite">
        {pending ? 'Creating account…' : 'Create account'}
      </span>
      <ArrowRight aria-hidden="true" className="size-4" />
    </Button>
  )
}

function DisplayErrorMessage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const accountDeleted = searchParams.get('deleted') === 'true'

  if (accountDeleted) {
    return (
      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
        Your account and planner data were permanently deleted.
      </div>
    )
  }

  if (!message) return null

  return (
    <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
      {message}
    </div>
  )
}

function GoogleSignupButton({ onStart }: { onStart: () => void }) {
  return (
    <form action={signInWithGoogle} onSubmit={onStart}>
      <Button
        type="submit"
        variant="outline"
        className="h-auto w-full rounded-xl border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-none hover:bg-surface-hover"
      >
        <Image src="/google-g.svg" width={18} height={18} alt="" aria-hidden="true" />
        Sign up with Google
      </Button>
    </form>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <MotionConfig reducedMotion="user">
        <AuthExperience />
      </MotionConfig>
    </Suspense>
  )
}

function AuthExperience() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [signupStep, setSignupStep] = useState<SignupStep>('choice')
  const [pyramidSpinToken, setPyramidSpinToken] = useState(0)
  const [authStep, setAuthStep] = useState<AuthStep>('email')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signinEmail, setSigninEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const otpRequestInFlight = useRef(false)
  const otpVerificationInFlight = useRef(false)
  const otpVerificationCompleted = useRef(false)

  const passwordsMatch = signupPassword.length > 0 && signupPassword === confirmPassword

  function triggerSignupSpin() {
    setPyramidSpinToken((current) => current + 1)
  }

  useEffect(() => {
    if (authStep !== 'verification' || resendSeconds <= 0) return

    const timeoutId = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [authStep, resendSeconds])

  useEffect(() => {
    if (searchParams.get('mode') !== 'signin') return

    window.requestAnimationFrame(() => {
      document.getElementById('auth-signin')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [searchParams])

  async function sendOtp() {
    const normalizedEmail = signinEmail.trim()
    if (otpRequestInFlight.current) return

    otpRequestInFlight.current = true
    setIsRequestingOtp(true)
    setOtpError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      })

      if (error) {
        setOtpError(getOtpErrorMessage(error, 'request'))
        return
      }

      setSigninEmail(normalizedEmail)
      setOtp('')
      setResendSeconds(OTP_RESEND_COOLDOWN_SECONDS)
      otpVerificationCompleted.current = false
      setAuthStep('verification')
    } finally {
      otpRequestInFlight.current = false
      setIsRequestingOtp(false)
    }
  }

  function handleSigninSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    void sendOtp()
  }

  async function verifyOtp(token = otp) {
    if (
      token.length !== OTP_LENGTH ||
      otpVerificationInFlight.current ||
      otpVerificationCompleted.current
    ) return

    otpVerificationInFlight.current = true
    setIsVerifyingOtp(true)
    setOtpError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: signinEmail.trim(),
        token,
        type: 'email',
      })

      if (error) {
        setOtpError(getOtpErrorMessage(error, 'verify'))
        return
      }

      otpVerificationCompleted.current = true
      router.replace('/home')
    } finally {
      otpVerificationInFlight.current = false
      setIsVerifyingOtp(false)
    }
  }

  function changeSigninEmail() {
    setAuthStep('email')
    setOtp('')
    setOtpError(null)
    setResendSeconds(0)
    otpVerificationCompleted.current = false
  }

  async function resendOtp() {
    if (resendSeconds > 0 || otpRequestInFlight.current) return
    await sendOtp()
  }

  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Link href="/" className="auth-brand" aria-label="Planomy home">
          <PlanomyIcon size={28} />
          <span>planomy</span>
        </Link>
        <div className="auth-art"><PyramidScene spinToken={pyramidSpinToken} /><span className="auth-ground" aria-hidden="true" /></div>
        <div className="auth-story-copy">
          <h2>A little structure.<br />A clearer mind.</h2>
          <p>A private place for your plans.<br />Space for everything you want to become.</p>
        </div>
        <div className="auth-story-footer"><span><Lock size={13} /> End-to-end encrypted</span><span className="auth-drag-hint">Drag to explore</span></div>
      </aside>

      <section className="auth-panel" aria-label="Planomy authentication">
        <GlassBackground />
        <Link href="/" className="auth-mobile-brand"><PlanomyIcon size={26} />planomy</Link>
        <div className="auth-form-wrap auth-stack">
          <Suspense fallback={null}><DisplayErrorMessage /></Suspense>

          {authStep === 'verification' ? (
            <motion.div key="verification" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
              <button type="button" onClick={changeSigninEmail} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md">
                <ArrowLeft aria-hidden="true" className="size-4" />
                Change email
              </button>
              <h1 className="auth-section-title">Check your email</h1>
              <p className="auth-section-copy">We sent an 8-digit code to <span className="font-medium text-foreground">{signinEmail}</span>.</p>
              <form onSubmit={(event) => { event.preventDefault(); void verifyOtp() }} className="mt-7">
                <label htmlFor="email-otp" className="sr-only">8-digit verification code</label>
                <InputOTP id="email-otp" maxLength={OTP_LENGTH} pattern="[0-9]*" value={otp} onChange={setOtp} onComplete={(value) => void verifyOtp(value)} pasteTransformer={(value) => value.replace(/\D/g, '').slice(0, OTP_LENGTH)} inputMode="numeric" autoComplete="one-time-code" autoFocus aria-describedby={otpError ? 'email-otp-error' : undefined} aria-invalid={Boolean(otpError)} aria-label="8-digit verification code" className="text-lg" containerClassName="justify-center">
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, index) => <InputOTPSlot key={index} index={index} className="h-11 w-8 text-base sm:h-12 sm:w-10 sm:text-lg" />)}
                  </InputOTPGroup>
                </InputOTP>
                {otpError && <p id="email-otp-error" role="alert" className="mt-4 text-sm leading-5 text-destructive">{otpError}</p>}
                <Button type="submit" disabled={isVerifyingOtp || otp.length !== OTP_LENGTH} aria-busy={isVerifyingOtp} className="mt-6 h-auto w-full rounded-xl px-4 py-3">
                  <span role="status" aria-live="polite">{isVerifyingOtp ? 'Verifying…' : 'Verify code'}</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </form>
              <div className="mt-5 flex flex-col items-center gap-2 text-sm">
                <button type="button" onClick={() => void resendOtp()} disabled={isRequestingOtp || resendSeconds > 0} className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground">
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  {isRequestingOtp ? 'Sending…' : resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="auth-sections" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <header className="auth-heading">
                <h1>Create your account.</h1>
                <p>A private place for your plans. A little more clarity.</p>
              </header>

              <section className="auth-section" aria-labelledby="auth-signup-title">
                <div className="auth-section-heading">
                  <h2 id="auth-signup-title">Sign up</h2>
                  <p>Start with the option that works best for you.</p>
                </div>

                {signupStep === 'choice' ? (
                  <div className="auth-choice-stack">
                    <GoogleSignupButton onStart={triggerSignupSpin} />
                    <Button type="button" variant="outline" onClick={() => { triggerSignupSpin(); setSignupStep('form') }} className="h-auto w-full rounded-xl border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-none hover:bg-surface-hover">
                      <Mail aria-hidden="true" className="size-4" />
                      Sign up with email
                    </Button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <button type="button" onClick={() => setSignupStep('choice')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <ArrowLeft aria-hidden="true" className="size-4" />
                      Other signup options
                    </button>
                    <form className="space-y-5" action={signUp} onSubmit={triggerSignupSpin}>
                      <div>
                        <label htmlFor="signup-email" className="auth-field-label">Email address</label>
                        <div className="relative">
                          <Mail className="auth-field-icon" aria-hidden="true" />
                          <Input id="signup-email" type="email" name="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required className="auth-field-input" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="signup-password" className="auth-field-label">Password</label>
                        <div className="relative">
                          <Lock className="auth-field-icon" aria-hidden="true" />
                          <Input id="signup-password" type="password" name="password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} placeholder="••••••••" autoComplete="new-password" required className="auth-field-input" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="confirm-password" className="auth-field-label">Confirm password</label>
                        <div className="relative">
                          <Lock className="auth-field-icon" aria-hidden="true" />
                          <Input id="confirm-password" type="password" name="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" autoComplete="new-password" required className="auth-field-input" />
                        </div>
                        {confirmPassword.length > 0 && <p className={`mt-2 text-xs ${passwordsMatch ? 'text-emerald-500' : 'text-destructive'}`}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</p>}
                      </div>
                      <SignupSubmitButton disabled={!passwordsMatch} />
                    </form>
                  </motion.div>
                )}
              </section>

              {signupStep === 'choice' && (
                <>
                  <div className="auth-section-divider"><span>Sign in</span></div>

                  <section id="auth-signin" className="auth-section" aria-labelledby="auth-signin-title">
                    <div className="auth-section-heading">
                      <h2 id="auth-signin-title">Welcome back.</h2>
                      <p>Enter your email and we’ll send you a secure sign-in code.</p>
                    </div>
                    <form onSubmit={handleSigninSubmit} className="space-y-5">
                      <div>
                        <label htmlFor="signin-email" className="auth-field-label">Email address</label>
                        <div className="relative">
                          <Mail className="auth-field-icon" aria-hidden="true" />
                          <Input id="signin-email" type="email" value={signinEmail} onChange={(event) => setSigninEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required className="auth-field-input" />
                        </div>
                      </div>
                      {otpError && <p role="alert" className="text-sm leading-5 text-destructive">{otpError}</p>}
                      <Button type="submit" disabled={isRequestingOtp} aria-busy={isRequestingOtp} className="h-auto w-full rounded-xl px-4 py-3">
                        <Mail aria-hidden="true" className="size-4" />
                        <span role="status" aria-live="polite">{isRequestingOtp ? 'Sending code…' : 'Sign in with email code'}</span>
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Button>
                    </form>
                  </section>
                </>
              )}
            </motion.div>
          )}
        </div>
        <p className="auth-privacy"><Lock size={13} aria-hidden="true" />Your plans are personal. Keep them that way.</p>
      </section>
    </div>
  )
}
