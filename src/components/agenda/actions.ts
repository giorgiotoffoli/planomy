'use server'

import { createClient } from '@/lib/supabase/server'
import { toAgendaBlock, toList } from '@/lib/supabase/domain-mappers'
import { MINUTE, SLOT_MINUTES, validateInterval, validateScheduledTime } from '@/lib/agenda'
import type { TaskOccurrence, TimeBlock } from '@/types'
import { getUserCategories } from '@/components/categories/queries'
import { normalizeRecurrenceRule, recurrenceMatchesDate } from '@/lib/recurrence'
import { materializeRecurringSessions } from '@/lib/recurring-sessions'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

function databaseError(error: { code?: string; message: string }) {
  return new Error(['42P01', 'PGRST205'].includes(error.code ?? '')
    ? 'Agenda is not configured in this Supabase project. Contact the project administrator.'
    : error.message)
}

export async function getAgendaData(startsAt: string, endsAt: string) {
  const { start, end } = validateInterval(startsAt, endsAt)
  if (end - start > 27 * 60 * 60_000) throw new Error('Request one local day at a time.')
  const { supabase, user } = await authenticatedClient()
  const { data: recurringTasks, error: recurringTasksError } = await supabase
    .from('tasks')
    .select('id, recurrence_rule')
    .eq('user_id', user.id)
    .eq('completed', false)
    .not('recurrence_rule', 'is', null)
  if (recurringTasksError) throw databaseError(recurringTasksError)
  await materializeRecurringSessions(
    supabase,
    user.id,
    recurringTasks,
    startsAt.slice(0, 10),
    endsAt.slice(0, 10),
  )
  const [blocks, lists, categories] = await Promise.all([
    supabase.from('task_time_blocks').select('*, occurrence:task_occurrences!task_time_blocks_owned_occurrence(*), task:tasks!task_time_blocks_owned_task(*, list:lists(id, title, emoji, default_view, color), category:categories(id, list_id, color))')
      .eq('user_id', user.id)
      .lt('starts_at', endsAt)
      .or(`ends_at.gt.${startsAt},and(ends_at.is.null,starts_at.gte.${startsAt})`)
      .order('starts_at'),
    supabase.from('lists').select('*').eq('user_id', user.id),
    getUserCategories(),
  ])
  if (blocks.error) throw databaseError(blocks.error)
  if (lists.error) throw databaseError(lists.error)
  return {
    blocks: blocks.data.filter((row) => !row.occurrence?.cancelled).map(toAgendaBlock),
    lists: lists.data.map(toList),
    categories,
  }
}

export async function getTaskTimeBlocks(taskId: string) {
  const { supabase, user } = await authenticatedClient()
  const { data, error } = await supabase
    .from('task_time_blocks')
    .select('*')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .order('starts_at')
  if (error) throw databaseError(error)
  return data as TimeBlock[]
}

/** Compatibility helper for callers that only need the first session. */
export async function getTaskTimeBlock(taskId: string) {
  const blocks = await getTaskTimeBlocks(taskId)
  return blocks[0] ?? null
}

export async function saveTimeBlock(
  taskId: string,
  startsAt: string,
  endsAt: string | null,
  blockId?: string,
  occurrenceId?: string | null,
) {
  const start = Date.parse(startsAt)
  const normalizedEndsAt = endsAt ?? (
    Number.isFinite(start)
      ? new Date(start + SLOT_MINUTES * MINUTE).toISOString()
      : null
  )
  validateScheduledTime(startsAt, normalizedEndsAt)
  const { supabase, user } = await authenticatedClient()
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, recurrence_rule')
    .eq('user_id', user.id)
    .eq('id', taskId)
    .maybeSingle()
  if (taskError) throw databaseError(taskError)
  if (!task) throw new Error('Task not found')
  let resolvedOccurrenceId = occurrenceId
  const rule = normalizeRecurrenceRule(task.recurrence_rule as never)
  const occurrenceDate = startsAt.slice(0, 10)
  if (resolvedOccurrenceId === undefined && rule && recurrenceMatchesDate(rule, occurrenceDate)) {
    const { data: occurrence, error: occurrenceError } = await supabase
      .from('task_occurrences')
      .upsert({ user_id: user.id, task_id: taskId, occurrence_date: occurrenceDate }, { onConflict: 'task_id,occurrence_date' })
      .select('id')
      .single()
    if (occurrenceError) throw databaseError(occurrenceError)
    resolvedOccurrenceId = occurrence.id
  }
  const occurrenceFields = resolvedOccurrenceId === undefined
    ? {}
    : { occurrence_id: resolvedOccurrenceId }
  const mutation = blockId
    ? supabase
      .from('task_time_blocks')
      .update({
        starts_at: startsAt,
        ends_at: normalizedEndsAt,
        status: 'scheduled',
        is_override: true,
        ...occurrenceFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', blockId)
      .eq('task_id', taskId)
      .eq('user_id', user.id)
    : supabase
      .from('task_time_blocks')
      .insert({
        task_id: taskId,
        user_id: user.id,
        starts_at: startsAt,
        ends_at: normalizedEndsAt,
        ...occurrenceFields,
        status: 'scheduled',
        is_override: Boolean(resolvedOccurrenceId !== undefined),
      })

  const { data, error } = await mutation.select('*').single()
  if (error) throw databaseError(error)
  if (!data) throw new Error('Scheduled session not found.')
  return data as TimeBlock
}

export async function removeTimeBlock(blockId: string) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('task_time_blocks')
    .delete()
    .eq('id', blockId)
    .eq('user_id', user.id)
  if (error) throw databaseError(error)
}

export async function removeTaskTimeBlocks(taskId: string) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('task_time_blocks')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', user.id)
  if (error) throw databaseError(error)
}

/** Remove only generated future sessions when a recurrence template changes. */
export async function removeGeneratedRecurringSessions(taskId: string) {
  const { supabase, user } = await authenticatedClient()
  const { data: occurrences, error: occurrenceError } = await supabase
    .from('task_occurrences')
    .select('id')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .eq('completed', false)
    .eq('skipped', false)
  if (occurrenceError) throw databaseError(occurrenceError)
  const occurrenceIds = occurrences.map((occurrence) => occurrence.id)
  if (!occurrenceIds.length) return
  const { error } = await supabase
    .from('task_time_blocks')
    .delete()
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .eq('is_override', false)
    .in('occurrence_id', occurrenceIds)
  if (error) throw databaseError(error)
}

export async function skipTimeBlock(blockId: string) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('task_time_blocks')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('id', blockId)
    .eq('user_id', user.id)
  if (error) throw databaseError(error)
}

export async function restoreTimeBlock(blockId: string) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('task_time_blocks')
    .update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('id', blockId)
    .eq('user_id', user.id)
  if (error) throw databaseError(error)
}

export async function ensureTaskOccurrences(
  taskId: string,
  dates: string[],
) {
  if (!dates.length) return [] as TaskOccurrence[]
  const { supabase, user } = await authenticatedClient()
  const rows = dates.map((occurrence_date) => ({
    user_id: user.id,
    task_id: taskId,
    occurrence_date,
  }))
  const { data, error } = await supabase
    .from('task_occurrences')
    .upsert(rows, { onConflict: 'task_id,occurrence_date', ignoreDuplicates: true })
    .select('*')
    .order('occurrence_date')
  if (error) throw databaseError(error)
  return data as TaskOccurrence[]
}
