'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type SupabaseError = { code?: string; message: string }

function focusError(error: SupabaseError) {
  if (error.message.includes('set_task_focus') || error.code === 'PGRST202') {
    return new Error(
      'Home focus is not configured in this Supabase project. Apply the latest database migration first.',
    )
  }

  return new Error(error.message)
}

async function authenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  return { supabase, user }
}

export async function setTaskFocused(taskId: string, focused: boolean) {
  const { supabase } = await authenticatedClient()
  const { error } = await supabase.rpc('set_task_focus', {
    p_task_id: taskId,
    p_focused: focused,
  })

  if (error) throw focusError(error)

  revalidatePath('/home')
}

export async function setTaskStashed(taskId: string, stashed: boolean) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('tasks')
    .update({ stashed, ...(stashed ? { focused: false } : {}) })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/home')
}
