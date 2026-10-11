'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toTaskWithList } from '@/lib/supabase/domain-mappers'
import { isDateKey, previousDateKey } from '@/lib/today'
import type { DailySelection } from '@/types'

type SupabaseError = { code?: string; message: string }

function todayDatabaseError(error: SupabaseError) {
  if (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.message.includes('daily_task_selections')
  ) {
    return new Error(
      'Today is not configured in this Supabase project. Contact the project administrator.',
    )
  }

  if (
    error.code === 'PGRST202' ||
    error.message.includes('set_daily_task_focus')
  ) {
    return new Error(
      'The Today focus function is missing from this Supabase project. Contact the project administrator.',
    )
  }

  return new Error(error.message)
}

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

function assertDate(date: string) {
  if (!isDateKey(date)) throw new Error('Invalid calendar date')
}

export async function getTodayData(date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const yesterday = previousDateKey(date)
  const [{ data: tasks, error: tasksError }, { data: selections, error: selectionsError }] = await Promise.all([
    supabase.from('tasks').select('*, list:lists (title, id, emoji, default_view)').eq('user_id', user.id).order('position').order('created_at', { ascending: false }),
    supabase.from('daily_task_selections').select('task_id, selected_date, focused').eq('user_id', user.id).in('selected_date', [date, yesterday]),
  ])
  if (tasksError) throw new Error(tasksError.message)
  if (selectionsError) throw todayDatabaseError(selectionsError)
  return { tasks: tasks.map(toTaskWithList), selections: selections as DailySelection[] }
}

export async function isTaskSelectedToday(taskId: string, date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const { data, error } = await supabase.from('daily_task_selections').select('task_id').eq('user_id', user.id).eq('task_id', taskId).eq('selected_date', date).maybeSingle()
  if (error) throw todayDatabaseError(error)
  return Boolean(data)
}

export async function selectTaskForDay(taskId: string, date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const { data: task } = await supabase.from('tasks').select('id').eq('id', taskId).eq('user_id', user.id).maybeSingle()
  if (!task) throw new Error('Task not found')
  const { error } = await supabase.from('daily_task_selections').upsert({ user_id: user.id, task_id: taskId, selected_date: date }, { onConflict: 'user_id,task_id,selected_date', ignoreDuplicates: true })
  if (error) throw todayDatabaseError(error)
  revalidatePath('/today')
}

export async function removeTaskFromDay(taskId: string, date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase.from('daily_task_selections').delete().eq('user_id', user.id).eq('task_id', taskId).eq('selected_date', date)
  if (error) throw todayDatabaseError(error)
  revalidatePath('/today')
}

export async function setTaskFocused(taskId: string, date: string, focused: boolean) {
  assertDate(date)
  const { supabase } = await authenticatedClient()
  const { error } = await supabase.rpc('set_daily_task_focus', { p_task_id: taskId, p_selected_date: date, p_focused: focused })
  if (error) throw todayDatabaseError(error)
  revalidatePath('/today')
}
