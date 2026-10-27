'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, KeyRound, ShieldCheck, Star, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import VaultPasswordForm from '@/components/e2ee/vault-password-form'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import type { StoredKeychain } from '@/components/e2ee/actions'
import { encryptString } from '@/lib/crypto/e2ee'
import type { OnboardingStep } from '@/lib/onboarding'
import {
  completeOnboarding,
  createOnboardingTask,
  finishOnboardingSecurity,
  setAccountPassword,
  startOnboarding,
  type OnboardingTaskResult,
} from './actions'

type OnboardingFlowProps = {
  initialStep: OnboardingStep
  initialKeychain: StoredKeychain | null
  pendingTaskExists: boolean
  hasAccountPassword: boolean
  googleSignup: boolean
}

function errorMessage(result: Extract<OnboardingTaskResult, { ok: false }>) {
  if (result.stage === 'focus') {
    return `Your task is on Home, but it could not be pinned as Focus. ${result.message}`
  }

  return result.message
}

export default function OnboardingFlow({
  initialStep,
  initialKeychain,
  pendingTaskExists,
  hasAccountPassword,
  googleSignup,
}: OnboardingFlowProps) {
  const router = useRouter()
  const { isRestoring, isUnlocked, masterKey } = useE2EE()
  const [step, setStep] = useState(initialStep)
  const [masterPasswordSet, setMasterPasswordSet] = useState(Boolean(initialKeychain))
  const [accountPasswordSet, setAccountPasswordSet] = useState(hasAccountPassword)
  const [accountPassword, setAccountPasswordValue] = useState('')
  const [confirmAccountPassword, setConfirmAccountPassword] = useState('')
  const [accountPasswordError, setAccountPasswordError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [focused, setFocused] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [taskExists, setTaskExists] = useState(pendingTaskExists)
  const [taskSaved, setTaskSaved] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const accountPasswordStepLabel =
    googleSignup ? '1 of 4' : accountPasswordSet ? '2 of 3' : '2 of 4'
  const securityStepLabel = googleSignup
    ? '3 of 4'
    : accountPasswordSet
      ? '2 of 3'
      : '3 of 4'
  const firstTaskStepLabel = googleSignup
    ? '4 of 4'
    : accountPasswordSet
      ? '3 of 3'
      : '4 of 4'

  async function begin() {
    setIsBusy(true)
    setCompletionError(null)
    try {
      const nextStep = await startOnboarding()
      setStep(nextStep)
    } catch (error) {
      setCompletionError(
        error instanceof Error ? error.message : 'Onboarding could not start.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function saveAccountPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!event.currentTarget.reportValidity()) return

    setIsBusy(true)
    setAccountPasswordError(null)

    try {
      const result = await setAccountPassword({
        password: accountPassword,
        confirmPassword: confirmAccountPassword,
      })
      if (!result.ok) {
        setAccountPasswordError(result.message)
        return
      }

      setAccountPasswordSet(true)
      setAccountPasswordValue('')
      setConfirmAccountPassword('')
      setStep(
        googleSignup && !masterPasswordSet
          ? 'welcome'
          : masterPasswordSet
            ? 'first-task'
            : 'security',
      )
    } catch (error) {
      setAccountPasswordError(
        error instanceof Error
          ? error.message
          : 'Your account password could not be saved.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function securityReady() {
    await finishOnboardingSecurity()
    setMasterPasswordSet(true)
    setStep(accountPasswordSet ? 'first-task' : 'account-password')
  }

  async function finish() {
    setIsBusy(true)
    setCompletionError(null)
    try {
      await completeOnboarding()
      router.replace('/home')
      router.refresh()
    } catch (error) {
      setCompletionError(
        error instanceof Error
          ? error.message
          : 'Onboarding could not be completed.',
      )
      setIsBusy(false)
    }
  }

  async function saveFirstTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!masterKey) {
      setTaskError('Unlock your encryption key before creating a task.')
      return
    }

    if (!taskExists && !title.trim()) {
      setTaskError('Enter a task title.')
      return
    }

    setIsBusy(true)
    setTaskError(null)

    try {
      const encryptedTitle = title.trim()
        ? await encryptString(title.trim(), masterKey)
        : ''
      const result = await createOnboardingTask({
        encryptedTitle,
        focused,
      })

      if (!result.ok) {
        if (
          result.taskId &&
          result.stage === 'focus'
        ) {
          setTaskExists(true)
        }
        setTaskError(errorMessage(result))
        return
      }

      setTaskSaved(true)
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : 'The task could not be saved.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  if (isRestoring) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Restoring your secure session…
      </p>
    )
  }

  if (step === 'welcome') {
    return (
      <div>
        {googleSignup && (
          <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Home className="size-4" /> Step 2 of 4
          </div>
        )}
        <p className="text-sm font-medium text-primary">Welcome to Planomy</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Capture everything. Choose what matters today.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Planomy separates collecting work from committing to it, so a busy
          Home keeps attention visible without asking you to manually build a day.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <Home className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold text-foreground">Home</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              See active work from every list in one calm workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <Sun className="size-5 text-amber-500" />
            <h2 className="mt-3 font-semibold text-foreground">Focus</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Keep up to three priorities close while deadlines stay visible automatically.
            </p>
          </div>
        </div>

        {completionError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {completionError}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={begin} disabled={isBusy}>
            Skip introduction
          </Button>
          <Button onClick={begin} disabled={isBusy}>
            {isBusy ? 'Starting…' : 'Continue'}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'account-password') {
    return (
      <div>
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <KeyRound className="size-4" /> Step {accountPasswordStepLabel}
        </div>
        <p className="text-sm font-medium text-primary">Account security</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Choose an account password.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {googleSignup
            ? 'Your Google account still works for sign-in. Add a Planomy account password too; it is separate from the master password that protects your encrypted plans.'
            : 'Add a password-based sign-in option for your Planomy account. It is separate from the master password that protects your encrypted plans.'}
        </p>

        <form onSubmit={saveAccountPassword} className="mt-6">
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="account-password"
          >
            Account password
          </label>
          <Input
            autoFocus
            id="account-password"
            type="password"
            value={accountPassword}
            onChange={(event) => setAccountPasswordValue(event.target.value)}
            className="mt-1.5"
            autoComplete="new-password"
            required
          />

          <label
            className="mt-4 block text-sm font-medium text-foreground"
            htmlFor="confirm-account-password"
          >
            Confirm account password
          </label>
          <Input
            id="confirm-account-password"
            type="password"
            value={confirmAccountPassword}
            onChange={(event) => setConfirmAccountPassword(event.target.value)}
            className="mt-1.5"
            autoComplete="new-password"
            required
          />

          {accountPasswordError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {accountPasswordError}
            </p>
          )}

          <Button type="submit" disabled={isBusy} className="mt-6 w-full">
            {isBusy ? 'Saving password…' : 'Continue'}
          </Button>
        </form>
      </div>
    )
  }

  if (step === 'security' || !isUnlocked) {
    return (
      <div>
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4" /> Step {securityStepLabel}
        </div>
        <VaultPasswordForm
          initialKeychain={initialKeychain}
          onSuccess={securityReady}
        />
      </div>
    )
  }

  if (taskSaved) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Sun className="size-6" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
          Your day is ready.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your first task is safely captured on Home
          {focused ? ' as a Focus task.' : '.'}
        </p>
        {completionError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {completionError}
          </p>
        )}
        <Button className="mt-7 w-full" onClick={finish} disabled={isBusy}>
          {isBusy ? 'Finishing…' : 'Open Home'}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sun className="size-4" /> Step {firstTaskStepLabel}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Choose your first task.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        It will appear on Home whether you organize it into a list now or later.
      </p>

      <form onSubmit={saveFirstTask} className="mt-6">
        {taskExists ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
            Your first task was already saved. Continue to finish setting up
            its Home state without creating a duplicate.
          </div>
        ) : (
          <>
            <label
              htmlFor="first-task-title"
              className="text-sm font-medium text-foreground"
            >
              Task title
            </label>
            <Input
              autoFocus
              id="first-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What would make today feel successful?"
              className="mt-1.5"
              maxLength={300}
              required
            />
          </>
        )}

        <button
          type="button"
          aria-pressed={focused}
          onClick={() => setFocused((current) => !current)}
          className="mt-4 flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left transition hover:bg-surface-hover"
        >
          <Star
            className={`mt-0.5 size-5 ${focused ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`}
          />
          <span>
            <span className="block font-medium text-foreground">
              Make this my Focus
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Focus highlights up to three priorities on Home.
            </span>
          </span>
        </button>

        {taskError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {taskError}
          </p>
        )}
        {completionError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {completionError}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={finish}
            disabled={isBusy}
          >
            Skip for now
          </Button>
          <Button type="submit" disabled={isBusy}>
            {isBusy
              ? 'Saving…'
              : taskExists
                ? 'Retry Home setup'
                : 'Create first task'}
          </Button>
        </div>
      </form>
    </div>
  )
}
