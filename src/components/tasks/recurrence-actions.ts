'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  generateOccurrenceDateKeys,
  normalizeRecurrenceRule,
  recurrenceMatchesDate,
} from '@/lib/recurrence'
import {
  materializeRecurringSessions,
  populateNextScheduledOccurrence,
} from '@/lib/recurring-sessions'
import { addCalendarDays } from '@/lib/today'
import type { CreateTaskInput, RecurrenceRule, TaskOccurrence, TaskOccurrenceOverride } from '@/types'
import type { Json } from '@/lib/supabase/database-types'
import { createTask, deleteTask, updateTask } from '@/components/tasks/actions'
import { saveTimeBlock } from '@/components/agenda/actions'
import type { RecurrenceScope } from '@/lib/recurrence-scope'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

type ScopeTaskRow = {
  id: string
  user_id: string
  title: string
  notes: string | null
  list_id: string | null
  category_id: string | null
  due_date: string | null
  due_time: string | null
  focused: boolean
  recurrence_rule: unknown
}

async function loadScopeTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, user_id, title, notes, list_id, category_id, due_date, due_time, focused, recurrence_rule')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Task not found.')
  return data as unknown as ScopeTaskRow
}

async function loadScopeOccurrence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
  occurrenceId: string,
) {
  const { data, error } = await supabase
    .from('task_occurrences')
    .select('*')
    .eq('id', occurrenceId)
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Task occurrence not found.')
  return data as TaskOccurrence
}

function scopeTaskInput(task: ScopeTaskRow, repeatRule: RecurrenceRule | null): CreateTaskInput {
  return {
    title: task.title,
    notes: task.notes ?? '',
    listId: task.list_id,
    categoryId: task.category_id,
    dueDate: task.due_date,
    dueTime: task.due_time,
    focused: task.focused,
    repeatRule,
  }
}

function overrideData(input: CreateTaskInput): TaskOccurrenceOverride {
  return {
    title: input.title,
    notes: input.notes,
    listId: input.listId,
    categoryId: input.categoryId,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
  }
}

function dateBefore(value: string) {
  return addCalendarDays(value, -1)
}

function localDateTimeParts(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function shiftRuleDates(rule: RecurrenceRule, fromDate: string, toDate: string) {
  const delta = Math.round(
    (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000,
  )
  if (!delta) return rule
  const shiftWeekday = (day: number) => ((day - 1 + delta) % 7 + 7) % 7 + 1
  return {
    ...rule,
    startDate: addCalendarDays(rule.startDate, delta),
    endDate: rule.endDate ? addCalendarDays(rule.endDate, delta) : rule.endDate,
    weekdays: rule.weekdays?.map(shiftWeekday).sort((a, b) => a - b),
  }
}

function ruleForSplit(
  original: RecurrenceRule,
  requested: RecurrenceRule,
  occurrenceDate: string,
  followingStartDate = occurrenceDate,
) {
  const previousDate = dateBefore(occurrenceDate)
  const nextStartDate = followingStartDate
  const oldDates = generateOccurrenceDateKeys(
    original,
    original.startDate,
    occurrenceDate,
  )
  const oldRule: RecurrenceRule = {
    ...original,
    endDate: original.endDate && original.endDate < previousDate
      ? original.endDate
      : previousDate,
    ...(original.count ? { count: oldDates.length } : { count: null }),
  }
  const requestedEnd = requested.endDate ?? original.endDate ?? null
  const nextRule: RecurrenceRule = {
    ...requested,
    startDate: followingStartDate,
    endDate: requestedEnd && requestedEnd >= nextStartDate ? requestedEnd : null,
    ...(original.count && requested.count === original.count
      ? { count: Math.max(1, original.count - oldDates.length) }
      : {}),
  }
  return { oldRule, nextRule }
}

async function clearOccurrenceBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  occurrenceIds: string[],
) {
  if (!occurrenceIds.length) return
  const { error } = await supabase
    .from('task_time_blocks')
    .delete()
    .eq('user_id', userId)
    .in('occurrence_id', occurrenceIds)
  if (error) throw new Error(error.message)
}

async function cancelMismatchedOccurrences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
  rule: RecurrenceRule | null,
) {
  const { data, error } = await supabase
    .from('task_occurrences')
    .select('id, occurrence_date, cancelled')
    .eq('user_id', userId)
    .eq('task_id', taskId)
  if (error) throw new Error(error.message)
  const mismatched = rule
    ? data.filter((occurrence) => !occurrence.cancelled && occurrence.occurrence_date >= rule.startDate && !recurrenceMatchesDate(rule, occurrence.occurrence_date))
    : data.filter((occurrence) => !occurrence.cancelled)
  if (!mismatched.length) return
  const ids = mismatched.map((occurrence) => occurrence.id)
  const { error: updateError } = await supabase
    .from('task_occurrences')
    .update({ cancelled: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids)
  if (updateError) throw new Error(updateError.message)
  await clearOccurrenceBlocks(supabase, userId, ids)
}

async function splitTaskSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  task: ScopeTaskRow,
  occurrence: TaskOccurrence,
  input: CreateTaskInput,
  followingStartDate?: string,
) {
  const original = normalizeRecurrenceRule(task.recurrence_rule as RecurrenceRule)
  const requested = normalizeRecurrenceRule(input.repeatRule)
  if (!original || !requested) throw new Error('This and following requires a recurring task.')
  if (original.startDate >= occurrence.occurrence_date) {
    await updateTask({ ...input, taskId: task.id })
    await cancelMismatchedOccurrences(supabase, userId, task.id, requested)
    return task.id
  }

  const { oldRule, nextRule } = ruleForSplit(original, requested, occurrence.occurrence_date, followingStartDate)
  const newTask = await createTask({ ...input, repeatRule: nextRule, focused: false })
  let copied = false
  try {
    const { data: oldOccurrences, error: occurrenceError } = await supabase
      .from('task_occurrences')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', task.id)
      .gte('occurrence_date', occurrence.occurrence_date)
      .order('occurrence_date')
    if (occurrenceError) throw new Error(occurrenceError.message)

    const copyable = oldOccurrences.filter((row) => recurrenceMatchesDate(nextRule, row.occurrence_date))
    const copiedRows = copyable.map((row) => ({
      user_id: userId,
      task_id: newTask.id,
      occurrence_date: row.occurrence_date,
      completed: row.completed,
      skipped: row.skipped,
      cancelled: row.cancelled,
      override_data: row.occurrence_date === occurrence.occurrence_date
        ? null
        : row.override_data as Json | null,
    }))
    const { data: newOccurrences, error: insertOccurrenceError } = copiedRows.length
      ? await supabase.from('task_occurrences').insert(copiedRows).select('id, occurrence_date')
      : { data: [], error: null }
    if (insertOccurrenceError) throw new Error(insertOccurrenceError.message)
    const newIdByDate = new Map((newOccurrences ?? []).map((row) => [row.occurrence_date, row.id]))
    const oldIds = oldOccurrences.map((row) => row.id)
    await updateTask({ ...scopeTaskInput(task, oldRule), taskId: task.id })
    if (oldIds.length) {
      const { data: oldBlocks, error: blockError } = await supabase
        .from('task_time_blocks')
        .select('starts_at, ends_at, status, session_index, is_override, occurrence_id')
        .eq('user_id', userId)
        .eq('task_id', task.id)
        .in('occurrence_id', oldIds)
      if (blockError) throw new Error(blockError.message)
      const dateByOldId = new Map(oldOccurrences.map((row) => [row.id, row.occurrence_date]))
      const newBlocks = (oldBlocks ?? []).flatMap((block) => {
        const date = block.occurrence_id ? dateByOldId.get(block.occurrence_id) : null
        const newOccurrenceId = date ? newIdByDate.get(date) : null
        return newOccurrenceId
          ? [{
              task_id: newTask.id,
              user_id: userId,
              occurrence_id: newOccurrenceId,
              session_index: block.session_index,
              starts_at: block.starts_at,
              ends_at: block.ends_at,
              status: block.status,
              is_override: block.is_override,
            }]
          : []
      })
      if (newBlocks.length) {
        const { error: blockInsertError } = await supabase.from('task_time_blocks').insert(newBlocks)
        if (blockInsertError) throw new Error(blockInsertError.message)
      }
      const { error: cancelError } = await supabase
        .from('task_occurrences')
        .update({ cancelled: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('task_id', task.id)
        .gte('occurrence_date', occurrence.occurrence_date)
      if (cancelError) throw new Error(cancelError.message)
    }
    copied = true
    revalidatePath('/')
    return newTask.id
  } catch (cause) {
    if (!copied) {
      try { await deleteTask(newTask.id) } catch { /* Preserve the original error. */ }
    }
    try {
      await updateTask({ ...scopeTaskInput(task, original), taskId: task.id })
    } catch {
      // Preserve the original split error; the original series remains the
      // source of truth if rollback itself is unavailable.
    }
    throw cause
  }
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
    .eq('cancelled', false)
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

export async function getTaskOccurrenceEditor(taskId: string, occurrenceId: string) {
  const { supabase, user } = await authenticatedClient()
  const occurrence = await loadScopeOccurrence(supabase, user.id, taskId, occurrenceId)
  return occurrence
}

export async function updateTaskOccurrenceWithScope(
  taskId: string,
  occurrenceId: string,
  input: CreateTaskInput,
  scope: RecurrenceScope,
  followingStartDate?: string,
) {
  const { supabase, user } = await authenticatedClient()
  const occurrence = await loadScopeOccurrence(supabase, user.id, taskId, occurrenceId)
  const task = await loadScopeTask(supabase, user.id, taskId)

  if (scope === 'this') {
    const { error } = await supabase
      .from('task_occurrences')
      .update({
        override_data: overrideData(input) as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', occurrence.id)
      .eq('task_id', taskId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return taskId
  }

  if (scope === 'all') {
    await updateTask({ ...input, taskId })
    await cancelMismatchedOccurrences(
      supabase,
      user.id,
      taskId,
      normalizeRecurrenceRule(input.repeatRule),
    )
    const { data: occurrences, error } = await supabase
      .from('task_occurrences')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .eq('completed', false)
      .eq('skipped', false)
      .eq('cancelled', false)
    if (error) throw new Error(error.message)
    await clearOccurrenceBlocks(supabase, user.id, occurrences.map((row) => row.id))
    const { error: clearOverrideError } = await supabase
      .from('task_occurrences')
      .update({ override_data: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .eq('cancelled', false)
    if (clearOverrideError) throw new Error(clearOverrideError.message)
    revalidatePath('/')
    return taskId
  }

  return splitTaskSeries(supabase, user.id, task, occurrence, input, followingStartDate)
}

export async function updateTaskOccurrenceTimingWithScope(input: {
  taskId: string
  occurrenceId: string
  sessionId: string
  sessionIndex: number | null | undefined
  startsAt: string
  endsAt: string | null
  scope: RecurrenceScope
}) {
  const { supabase, user } = await authenticatedClient()
  const occurrence = await loadScopeOccurrence(supabase, user.id, input.taskId, input.occurrenceId)
  const task = await loadScopeTask(supabase, user.id, input.taskId)
  const rule = normalizeRecurrenceRule(task.recurrence_rule as RecurrenceRule)

  if (input.scope === 'this') {
    await saveTimeBlock(
      input.taskId,
      input.startsAt,
      input.endsAt,
      input.sessionId,
      input.occurrenceId,
    )
    return input.taskId
  }
  if (!rule || input.sessionIndex === null || input.sessionIndex === undefined) {
    throw new Error('This scheduled session cannot be edited as a recurring series.')
  }
  const session = rule.scheduledSessions?.[input.sessionIndex]
  if (!session) throw new Error('Scheduled session not found.')
  const start = Date.parse(input.startsAt)
  const end = input.endsAt ? Date.parse(input.endsAt) : NaN
  if (!Number.isFinite(start) || (input.endsAt && !Number.isFinite(end))) {
    throw new Error('Choose valid scheduled times.')
  }
  const target = localDateTimeParts(input.startsAt, session.timeZone)
  const shiftedRule = shiftRuleDates(rule, occurrence.occurrence_date, target.date)
  const durationMinutes = input.endsAt
    ? Math.max(15, Math.round((end - start) / 60_000))
    : null
  const nextRule: RecurrenceRule = {
    ...shiftedRule,
    scheduledSessions: shiftedRule.scheduledSessions?.map((candidate, index) =>
      index === input.sessionIndex
        ? {
            ...candidate,
            startTime: localDateTimeParts(input.startsAt, candidate.timeZone).time,
            durationMinutes,
          }
        : candidate,
    ),
  }
  const nextInput = scopeTaskInput(task, nextRule)
  if (input.scope === 'all') {
    await updateTaskOccurrenceWithScope(input.taskId, input.occurrenceId, nextInput, 'all')
    return input.taskId
  }
  return updateTaskOccurrenceWithScope(input.taskId, input.occurrenceId, nextInput, 'following', target.date)
}

export async function deleteTaskOccurrenceWithScope(
  taskId: string,
  occurrenceId: string,
  scope: RecurrenceScope,
) {
  const { supabase, user } = await authenticatedClient()
  const occurrence = await loadScopeOccurrence(supabase, user.id, taskId, occurrenceId)
  if (scope === 'all') {
    await deleteTask(taskId)
    return
  }
  const task = await loadScopeTask(supabase, user.id, taskId)
  const rule = normalizeRecurrenceRule(task.recurrence_rule as RecurrenceRule)
  if (!rule) throw new Error('This task is not recurring.')

  if (scope === 'following' && rule.startDate <= occurrence.occurrence_date) {
    await deleteTask(taskId)
    return
  }

  const cutoff = scope === 'following' ? occurrence.occurrence_date : occurrence.occurrence_date
  const { data: affected, error: affectedError } = await supabase
    .from('task_occurrences')
    .select('id')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .gte('occurrence_date', cutoff)
  if (affectedError) throw new Error(affectedError.message)
  const affectedIds = affected.map((row) => row.id)
  if (scope === 'this') {
    const { error } = await supabase
      .from('task_occurrences')
      .update({ cancelled: true, updated_at: new Date().toISOString() })
      .eq('id', occurrenceId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await clearOccurrenceBlocks(supabase, user.id, [occurrenceId])
  } else {
    const prefixRule: RecurrenceRule = {
      ...rule,
      endDate: dateBefore(occurrence.occurrence_date),
      ...(rule.count ? {
        count: generateOccurrenceDateKeys(rule, rule.startDate, occurrence.occurrence_date).length,
      } : { count: null }),
    }
    await updateTask({ ...scopeTaskInput(task, prefixRule), taskId })
    if (affectedIds.length) {
      const { error } = await supabase
        .from('task_occurrences')
        .update({ cancelled: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .gte('occurrence_date', cutoff)
      if (error) throw new Error(error.message)
      await clearOccurrenceBlocks(supabase, user.id, affectedIds)
    }
  }
  revalidatePath('/')
}
