import { createClient } from '@/lib/supabase/server'
import {
  generateOccurrenceDateKeys,
  nextOccurrenceDate,
  normalizeRecurrenceRule,
  recurringSessionTimes,
} from '@/lib/recurrence'
import { addCalendarDays } from '@/lib/today'
import type { RecurrenceRule, TaskOccurrence } from '@/types'

type RecurringTask = {
  id: string
  recurrence_rule: unknown
}

/**
 * Materialize the visible part of a recurring schedule. Occurrence and
 * session identities are unique, so refreshing Calendar or Planner is safe.
 * A materialized row is also what gives a dragged/resized session its own
 * durable exception without changing the recurrence template.
 */
export async function materializeRecurringSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tasks: RecurringTask[],
  rangeStart: string,
  rangeEnd: string,
) {
  const materialized: TaskOccurrence[] = []
  for (const task of tasks) {
    const rule = normalizeRecurrenceRule(task.recurrence_rule as RecurrenceRule)
    if (!rule) continue

    // Keep date iteration in the recurrence module's local-date model. A
    // bounded range is used here because the task rule itself does the exact
    // matching and count/end-date checks.
    const occurrenceDates = generateOccurrenceDateKeys(rule, rangeStart, rangeEnd)
    if (!occurrenceDates.length) continue

    const { error: occurrenceUpsertError } = await supabase
      .from('task_occurrences')
      .upsert(
        occurrenceDates.map((occurrence_date) => ({
          user_id: userId,
          task_id: task.id,
          occurrence_date,
        })),
        { onConflict: 'task_id,occurrence_date', ignoreDuplicates: true },
      )
    if (occurrenceUpsertError) throw new Error(occurrenceUpsertError.message)

    const { data: occurrences, error: occurrenceReadError } = await supabase
      .from('task_occurrences')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', task.id)
      .gte('occurrence_date', rangeStart)
      .lt('occurrence_date', rangeEnd)
    if (occurrenceReadError) throw new Error(occurrenceReadError.message)
    materialized.push(...(occurrences as TaskOccurrence[]))

    const sessions = occurrences.flatMap((occurrence) =>
      recurringSessionTimes(rule, occurrence.occurrence_date).map((session) => ({
        user_id: userId,
        task_id: task.id,
        occurrence_id: occurrence.id,
        session_index: session.sessionIndex,
        is_override: false,
        starts_at: session.startsAt,
        ends_at: session.endsAt,
        status: 'scheduled' as const,
      })),
    )
    if (!sessions.length) continue

    const { error: sessionUpsertError } = await supabase
      .from('task_time_blocks')
      .upsert(sessions, {
        onConflict: 'occurrence_id,session_index',
        ignoreDuplicates: true,
      })
    if (sessionUpsertError) throw new Error(sessionUpsertError.message)
  }
  return materialized
}

export async function populateNextScheduledOccurrence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
  rule: NonNullable<ReturnType<typeof normalizeRecurrenceRule>>,
  occurrenceDate: string,
  occurrenceId: string,
) {
  void occurrenceId
  const nextDate = nextOccurrenceDate(rule, occurrenceDate)
  if (!nextDate) return null

  const { error: nextOccurrenceError } = await supabase
    .from('task_occurrences')
    .upsert(
      { user_id: userId, task_id: taskId, occurrence_date: nextDate },
      { onConflict: 'task_id,occurrence_date', ignoreDuplicates: true },
    )
  if (nextOccurrenceError) throw new Error(nextOccurrenceError.message)

  const { data: nextOccurrence, error: nextOccurrenceReadError } = await supabase
    .from('task_occurrences')
    .select('*')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .eq('occurrence_date', nextDate)
    .single()
  if (nextOccurrenceReadError) throw new Error(nextOccurrenceReadError.message)

  await materializeRecurringSessions(
    supabase,
    userId,
    [{ id: taskId, recurrence_rule: rule }],
    nextDate,
    addCalendarDays(nextDate, 1),
  )
  return nextOccurrence
}
