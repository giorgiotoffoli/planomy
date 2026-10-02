'use server'

import { createClient } from '@/lib/supabase/server'
import { validateInterval } from '@/lib/agenda'
import type { AgendaBlock, List, TimeBlock } from '@/types'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

function databaseError(error: { code?: string; message: string }) {
  return new Error(['42P01', 'PGRST205'].includes(error.code ?? '')
    ? 'Agenda is not set up yet. Apply the task time blocks database migration, then try again.'
    : error.message)
}

export async function getAgendaData(startsAt: string, endsAt: string) {
  const { start, end } = validateInterval(startsAt, endsAt)
  if (end - start > 27 * 60 * 60_000) throw new Error('Request one local day at a time.')
  const { supabase, user } = await authenticatedClient()
  const [blocks, lists] = await Promise.all([
    supabase.from('task_time_blocks').select('*, task:tasks!task_time_blocks_owned_task(*, list:lists(id, title, default_view))')
      .eq('user_id', user.id).lt('starts_at', endsAt).gt('ends_at', startsAt).order('starts_at'),
    supabase.from('lists').select('*').eq('user_id', user.id),
  ])
  if (blocks.error) throw databaseError(blocks.error)
  if (lists.error) throw databaseError(lists.error)
  return { blocks: blocks.data as unknown as AgendaBlock[], lists: lists.data as List[] }
}

export async function getTaskTimeBlock(taskId: string) {
  const { supabase, user } = await authenticatedClient()
  const { data, error } = await supabase.from('task_time_blocks').select('*').eq('user_id', user.id).eq('task_id', taskId).maybeSingle()
  if (error) throw databaseError(error)
  return data as TimeBlock | null
}

export async function saveTimeBlock(taskId: string, startsAt: string, endsAt: string) {
  validateInterval(startsAt, endsAt)
  const { supabase, user } = await authenticatedClient()
  const { data: task, error: taskError } = await supabase.from('tasks').select('id').eq('user_id', user.id).eq('id', taskId).maybeSingle()
  if (taskError) throw databaseError(taskError)
  if (!task) throw new Error('Task not found')
  const { data, error } = await supabase.from('task_time_blocks').upsert({ task_id: taskId, user_id: user.id, starts_at: startsAt, ends_at: endsAt }, { onConflict: 'task_id' }).select('*').single()
  if (error) throw databaseError(error)
  return data as TimeBlock
}

export async function removeTimeBlock(taskId: string) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase.from('task_time_blocks').delete().eq('task_id', taskId).eq('user_id', user.id)
  if (error) throw databaseError(error)
}
