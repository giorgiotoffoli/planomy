'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isDateKey, previousDateKey } from '@/lib/my-day'
import type { DailySelection, TaskWithList } from '@/types'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

function assertDate(date: string) {
  if (!isDateKey(date)) throw new Error('Invalid calendar date')
}

export async function getMyDayData(date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const yesterday = previousDateKey(date)
  const [{ data: tasks, error: tasksError }, { data: selections, error: selectionsError }] = await Promise.all([
    supabase.from('tasks').select('*, list:lists (title, id, default_view)').eq('user_id', user.id).order('position').order('created_at', { ascending: false }),
    supabase.from('daily_task_selections').select('task_id, selected_date, focused').eq('user_id', user.id).in('selected_date', [date, yesterday]),
  ])
  if (tasksError) throw new Error(tasksError.message)
  if (selectionsError) throw new Error(selectionsError.message)
  return { tasks: tasks as TaskWithList[], selections: selections as DailySelection[] }
}

export async function isTaskSelectedToday(taskId: string, date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const { data } = await supabase.from('daily_task_selections').select('task_id').eq('user_id', user.id).eq('task_id', taskId).eq('selected_date', date).maybeSingle()
  return Boolean(data)
}

export async function selectTaskForDay(taskId: string, date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const { data: task } = await supabase.from('tasks').select('id').eq('id', taskId).eq('user_id', user.id).maybeSingle()
  if (!task) throw new Error('Task not found')
  const { error } = await supabase.from('daily_task_selections').upsert({ user_id: user.id, task_id: taskId, selected_date: date }, { onConflict: 'user_id,task_id,selected_date', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  revalidatePath('/my-day')
}

export async function removeTaskFromDay(taskId: string, date: string) {
  assertDate(date)
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase.from('daily_task_selections').delete().eq('user_id', user.id).eq('task_id', taskId).eq('selected_date', date)
  if (error) throw new Error(error.message)
  revalidatePath('/my-day')
}

export async function setTaskFocused(taskId: string, date: string, focused: boolean) {
  assertDate(date)
  const { supabase } = await authenticatedClient()
  const { error } = await supabase.rpc('set_daily_task_focus', { p_task_id: taskId, p_selected_date: date, p_focused: focused })
  if (error) throw new Error(error.message)
  revalidatePath('/my-day')
}
