'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, ShieldCheck, Star, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import VaultPasswordForm from '@/components/e2ee/vault-password-form'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import type { StoredKeychain } from '@/components/e2ee/actions'
import { encryptString } from '@/lib/crypto/e2ee'
import { localDateKey } from '@/lib/my-day'
import type { OnboardingStep } from '@/lib/onboarding'
import {
  completeOnboarding,
  createOnboardingTask,
  finishOnboardingSecurity,
  startOnboarding,
  type OnboardingTaskResult,
} from './actions'

type OnboardingFlowProps = {
  initialStep: OnboardingStep
  initialKeychain: StoredKeychain | null
  pendingTaskExists: boolean
}

function errorMessage(result: Extract<OnboardingTaskResult, { ok: false }>) {
  if (result.stage === 'selection') {
    return `Your task is safe in Inbox, but it could not be added to My Day. ${result.message}`
  }

  if (result.stage === 'focus') {
    return `Your task is in Inbox and My Day, but it could not be pinned as Focus. ${result.message}`
  }

  return result.message
}

export default function OnboardingFlow({
  initialStep,
  initialKeychain,
  pendingTaskExists,
}: OnboardingFlowProps) {
  const router = useRouter()
  const { isRestoring, isUnlocked, masterKey } = useE2EE()
  const [step, setStep] = useState(initialStep)
  const [title, setTitle] = useState('')
  const [focused, setFocused] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [taskExists, setTaskExists] = useState(pendingTaskExists)
  const [taskSaved, setTaskSaved] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)

  async function begin() {
    setIsBusy(true)
    setCompletionError(null)
    try {
      await startOnboarding()
      setStep('security')
    } catch (error) {
      setCompletionError(
        error instanceof Error ? error.message : 'Onboarding could not start.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function securityReady() {
    await finishOnboardingSecurity()
    setStep('first-task')
  }

  async function finish() {
    setIsBusy(true)
    setCompletionError(null)
    try {
      await completeOnboarding()
      router.replace('/my-day')
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
        selectedDate: localDateKey(),
        focused,
      })

      if (!result.ok) {
        if (
          result.taskId &&
          (result.stage === 'selection' || result.stage === 'focus')
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
        <p className="text-sm font-medium text-blue-600">Welcome to Planomy</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Capture everything. Choose what matters today.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Planomy separates collecting work from committing to it, so a busy
          Inbox never has to become a busy day.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <Inbox className="size-5 text-blue-600" />
            <h2 className="mt-3 font-semibold text-slate-900">Inbox</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Capture unorganized tasks quickly and sort them when you are ready.
            </p>
          </div>
          <div className="rounded-2xl border bg-slate-50 p-4">
            <Sun className="size-5 text-amber-500" />
            <h2 className="mt-3 font-semibold text-slate-900">My Day</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Intentionally choose today’s work from Inbox or any list.
            </p>
          </div>
        </div>

        {completionError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
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

  if (step === 'security' || !isUnlocked) {
    return (
      <div>
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-500">
          <ShieldCheck className="size-4" /> Step 2 of 3
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
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Sun className="size-6" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Your day is ready.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your first task is safely captured in Inbox and selected for My Day
          {focused ? ' as a Focus task.' : '.'}
        </p>
        {completionError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {completionError}
          </p>
        )}
        <Button className="mt-7 w-full" onClick={finish} disabled={isBusy}>
          {isBusy ? 'Finishing…' : 'Open My Day'}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-500">
        <Sun className="size-4" /> Step 3 of 3
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Choose your first task.
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        It will stay in Inbox and also appear in My Day. You can organize it
        into a list later.
      </p>

      <form onSubmit={saveFirstTask} className="mt-6">
        {taskExists ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Your first task was already saved. Continue to finish adding it to
            My Day without creating a duplicate.
          </div>
        ) : (
          <>
            <label
              htmlFor="first-task-title"
              className="text-sm font-medium text-slate-700"
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
          className="mt-4 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:bg-slate-50"
        >
          <Star
            className={`mt-0.5 size-5 ${focused ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`}
          />
          <span>
            <span className="block font-medium text-slate-900">
              Make this my Focus
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Focus highlights up to three priorities in My Day.
            </span>
          </span>
        </button>

        {taskError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {taskError}
          </p>
        )}
        {completionError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
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
                ? 'Retry My Day setup'
                : 'Create first task'}
          </Button>
        </div>
      </form>
    </div>
  )
}
