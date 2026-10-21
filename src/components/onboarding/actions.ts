'use server'

import { getUserKeychain, type StoredKeychain } from '@/components/e2ee/actions'
import {
  isUuid,
  ONBOARDING_VERSION,
  resolveOnboardingState,
  type OnboardingState,
} from '@/lib/onboarding'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type InitialOnboardingState = OnboardingState & {
  userId: string
  keychain: StoredKeychain | null
  pendingTaskExists: boolean
  hasAccountPassword: boolean
}

export type OnboardingTaskResult =
  | { ok: true; taskId: string; focused: boolean }
  | {
      ok: false
      taskId: string | null
      stage: 'prepare' | 'task' | 'focus'
      message: string
    }

async function authenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) redirect('/auth')

  return { supabase, user }
}

function userHasAccountPassword(user: {
  app_metadata?: Record<string, unknown>
}) {
  const providers = user.app_metadata?.providers
  return Array.isArray(providers) && providers.includes('email')
}

export async function getOnboardingState(): Promise<InitialOnboardingState> {
  const { supabase, user } = await authenticatedClient()
  const keychain = await getUserKeychain()
  const hasAccountPassword = userHasAccountPassword(user)
  const state = resolveOnboardingState(
    user.user_metadata,
    Boolean(keychain),
    hasAccountPassword,
  )
  let pendingTaskExists = false

  if (isUuid(state.pendingTaskId)) {
    const { data: pendingTask, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', state.pendingTaskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    pendingTaskExists = Boolean(pendingTask)
  }

  return {
    ...state,
    userId: user.id,
    keychain,
    pendingTaskExists,
    hasAccountPassword,
  }
}

export async function startOnboarding(): Promise<'account-password' | 'security'> {
  const { supabase, user } = await authenticatedClient()
  const step = userHasAccountPassword(user) ? 'security' : 'account-password'
  const { error } = await supabase.auth.updateUser({
    data: {
      onboarding_status: 'started',
      onboarding_step: step,
      onboarding_version: ONBOARDING_VERSION,
    },
  })

  if (error) throw new Error(error.message)
  return step
}

export async function setAccountPassword(input: {
  password: string
  confirmPassword: string
}) {
  if (!input.password) throw new Error('Choose an account password.')
  if (input.password !== input.confirmPassword) {
    throw new Error('Account passwords do not match.')
  }

  const { supabase, user } = await authenticatedClient()
  const { data: keychain, error: keychainError } = await supabase
    .from('user_keychain')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (keychainError) throw new Error(keychainError.message)

  const { error } = await supabase.auth.updateUser({
    password: input.password,
    data: {
      onboarding_status: 'started',
      onboarding_step: keychain ? 'first-task' : 'security',
      onboarding_version: ONBOARDING_VERSION,
    },
  })

  if (error) throw new Error(error.message)
}

export async function finishOnboardingSecurity() {
  const { supabase, user } = await authenticatedClient()
  const { data: keychain, error: keychainError } = await supabase
    .from('user_keychain')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (keychainError) throw new Error(keychainError.message)
  if (!keychain) throw new Error('Create your encryption key before continuing.')

  const nextStep = userHasAccountPassword(user)
    ? 'first-task'
    : 'account-password'

  const { error } = await supabase.auth.updateUser({
    data: {
      onboarding_status: 'started',
      onboarding_step: nextStep,
      onboarding_version: ONBOARDING_VERSION,
    },
  })

  if (error) throw new Error(error.message)
}

export async function completeOnboarding() {
  const { supabase, user } = await authenticatedClient()
  if (!userHasAccountPassword(user)) {
    throw new Error('Create your account password before continuing.')
  }

  const { data: keychain, error: keychainError } = await supabase
    .from('user_keychain')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (keychainError) throw new Error(keychainError.message)
  if (!keychain) throw new Error('Encryption setup is required.')

  const { error } = await supabase.auth.updateUser({
    data: {
      onboarding_status: 'complete',
      onboarding_step: 'complete',
      onboarding_task_id: null,
      onboarding_version: ONBOARDING_VERSION,
    },
  })

  if (error) throw new Error(error.message)
}

export async function createOnboardingTask(input: {
  encryptedTitle: string
  focused: boolean
}): Promise<OnboardingTaskResult> {
  const { supabase, user } = await authenticatedClient()
  const taskId = isUuid(user.user_metadata.onboarding_task_id)
    ? user.user_metadata.onboarding_task_id
    : crypto.randomUUID()

  if (!isUuid(user.user_metadata.onboarding_task_id)) {
    const { error } = await supabase.auth.updateUser({
      data: {
        onboarding_status: 'started',
        onboarding_step: 'first-task',
        onboarding_task_id: taskId,
        onboarding_version: ONBOARDING_VERSION,
      },
    })

    if (error) {
      return {
        ok: false,
        taskId: null,
        stage: 'prepare',
        message: error.message,
      }
    }
  }

  const { data: existingTask, error: lookupError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (lookupError) {
    return {
      ok: false,
      taskId,
      stage: 'task',
      message: lookupError.message,
    }
  }

  if (!existingTask) {
    if (!input.encryptedTitle) {
      return {
        ok: false,
        taskId,
        stage: 'task',
        message: 'Enter a task title.',
      }
    }

    const { error } = await supabase.from('tasks').insert({
      id: taskId,
      user_id: user.id,
      title: input.encryptedTitle,
      notes: '',
      list_id: null,
    })

    if (error) {
      return { ok: false, taskId, stage: 'task', message: error.message }
    }
  }

  if (input.focused) {
    const { error: focusError } = await supabase.rpc('set_task_focus', {
      p_task_id: taskId,
      p_focused: true,
    })

    if (focusError) {
      return {
        ok: false,
        taskId,
        stage: 'focus',
        message: focusError.message,
      }
    }
  }

  return { ok: true, taskId, focused: input.focused }
}
