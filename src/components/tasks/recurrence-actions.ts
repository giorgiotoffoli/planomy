'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeRecurrenceRule } from '@/lib/recurrence'
import {
  materializeRecurringSessions,
  populateNextScheduledOccurrence,
} from '@/lib/recurring-sessions'
import type { TaskOccurrence } from '@/types'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}


/**
 * Materialize only the visible recurrence window. The unique task/date key in
 * the database makes this safe to call on every refresh and device.
 */
export async function getTaskOccurrencesForRange(
  taskId: string,
  rangeStart: string,
  rangeEnd: string,
) {
  const { supabase, user } = await authenticatedClient()
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('recurrence_rule')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (taskError) throw new Error(taskError.message)
  const rule = normalizeRecurrenceRule(task?.recurrence_rule as never)
  if (!rule) return [] as TaskOccurrence[]
  await materializeRecurringSessions(
    supabase,
    user.id,
    [{ id: taskId, recurrence_rule: rule }],
    rangeStart,
    rangeEnd,
  )

  const { data, error } = await supabase
    .from('task_occurrences')
    .select('*')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .gte('occurrence_date', rangeStart)
    .lt('occurrence_date', rangeEnd)
    .order('occurrence_date')
  if (error) throw new Error(error.message)
  return data as TaskOccurrence[]
}

export async function updateTaskOccurrenceCompleted(
  occurrenceId: string,
  completed: boolean,
) {
  const { supabase, user } = await authenticatedClient()
  const { data: occurrence, error: occurrenceError } = await supabase
    .from('task_occurrences')
    .select('*')
    .eq('id', occurrenceId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (occurrenceError) throw new Error(occurrenceError.message)
  if (!occurrence) throw new Error('Task occurrence not found.')

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('recurrence_rule')
    .eq('id', occurrence.task_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (taskError) throw new Error(taskError.message)

  const { error: updateError } = await supabase
    .from('task_occurrences')
    .update({ completed, skipped: false, updated_at: new Date().toISOString() })
    .eq('id', occurrenceId)
    .eq('user_id', user.id)
  if (updateError) throw new Error(updateError.message)

  const rule = normalizeRecurrenceRule(task?.recurrence_rule as never)
  const nextOccurrence = completed && rule
    ? await populateNextScheduledOccurrence(
      supabase,
      user.id,
      occurrence.task_id,
      rule,
      occurrence.occurrence_date,
      occurrence.id,
    )
    : null

  const taskCompleted = Boolean(completed && (!rule || !nextOccurrence))
  const { error: taskStateError } = await supabase
    .from('tasks')
    .update({
      completed: taskCompleted,
      ...(taskCompleted ? { focused: false } : {}),
    })
    .eq('id', occurrence.task_id)
    .eq('user_id', user.id)
  if (taskStateError) throw new Error(taskStateError.message)

  return {
    occurrenceId,
    completed,
    taskCompleted,
    nextOccurrenceDate: nextOccurrence?.occurrence_date ?? null,
  }
}

export async function updateTaskOccurrenceSkipped(
  occurrenceId: string,
  skipped: boolean,
) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('task_occurrences')
    .update({ skipped, updated_at: new Date().toISOString() })
    .eq('id', occurrenceId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
}
