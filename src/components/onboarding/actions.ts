'use server'

import { getUserKeychain, type StoredKeychain } from '@/components/e2ee/actions'
import { isDateKey } from '@/lib/my-day'
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
}

export type OnboardingTaskResult =
  | { ok: true; taskId: string; focused: boolean }
  | {
      ok: false
      taskId: string | null
      stage: 'prepare' | 'task' | 'selection' | 'focus'
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

async function updateOnboardingMetadata(data: Record<string, unknown>) {
  const { supabase } = await authenticatedClient()
  const { error } = await supabase.auth.updateUser({ data })

  if (error) throw new Error(error.message)
}

export async function getOnboardingState(): Promise<InitialOnboardingState> {
  const { supabase, user } = await authenticatedClient()
  const keychain = await getUserKeychain()
  const state = resolveOnboardingState(user.user_metadata, Boolean(keychain))
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
  }
}

export async function startOnboarding() {
  await updateOnboardingMetadata({
    onboarding_status: 'started',
    onboarding_step: 'security',
    onboarding_version: ONBOARDING_VERSION,
  })
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

  const { error } = await supabase.auth.updateUser({
    data: {
      onboarding_status: 'started',
      onboarding_step: 'first-task',
      onboarding_version: ONBOARDING_VERSION,
    },
  })

  if (error) throw new Error(error.message)
}

export async function completeOnboarding() {
  const { supabase, user } = await authenticatedClient()
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
  selectedDate: string
  focused: boolean
}): Promise<OnboardingTaskResult> {
  if (!isDateKey(input.selectedDate)) {
    return {
      ok: false,
      taskId: null,
      stage: 'selection',
      message: 'The selected day is invalid.',
    }
  }

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

  const { error: selectionError } = await supabase
    .from('daily_task_selections')
    .upsert(
      {
        user_id: user.id,
        task_id: taskId,
        selected_date: input.selectedDate,
      },
      {
        onConflict: 'user_id,task_id,selected_date',
        ignoreDuplicates: true,
      },
    )

  if (selectionError) {
    return {
      ok: false,
      taskId,
      stage: 'selection',
      message: selectionError.message,
    }
  }

  if (input.focused) {
    const { error: focusError } = await supabase.rpc('set_daily_task_focus', {
      p_task_id: taskId,
      p_selected_date: input.selectedDate,
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
