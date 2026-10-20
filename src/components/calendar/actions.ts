'use server'

import { createClient } from '@/lib/supabase/server'
import { validateCalendarRange, type CalendarRangeInput } from '@/lib/events'
import { getEventsInRange } from '@/components/events/actions'
import { getUserCategories } from '@/components/categories/queries'
import { materializeRecurringSessions } from '@/lib/recurring-sessions'
import {
  toAgendaBlock,
  toList,
  toTaskWithList,
} from '@/lib/supabase/domain-mappers'

const taskSelection =
  '*, list:lists(id, title, emoji, default_view, color), category:categories(id, list_id, color)' as const
const scheduledSelection =
  '*, occurrence:task_occurrences!task_time_blocks_owned_occurrence(*), task:tasks!task_time_blocks_owned_task(*, list:lists(id, title, emoji, default_view, color), category:categories(id, list_id, color))' as const

async function authenticatedCalendarContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

async function getScheduledTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  range: ReturnType<typeof validateCalendarRange>,
) {
  const scheduledTasks = await supabase
    .from('task_time_blocks')
    .select(scheduledSelection)
    .eq('user_id', userId)
    .lt('starts_at', range.endsAt)
    .or(
      `ends_at.gt.${range.startsAt},and(ends_at.is.null,starts_at.gte.${range.startsAt})`,
    )
    .order('starts_at')
  if (scheduledTasks.error) throw new Error(scheduledTasks.error.message)

  return scheduledTasks.data
    .filter((row) => !row.occurrence?.cancelled)
    .map(toAgendaBlock)
}

async function queryCalendarBaseData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  range: ReturnType<typeof validateCalendarRange>,
) {
  const [dueTasks, events, lists, categories, scheduledTasks] = await Promise.all([
    supabase
      .from('tasks')
      .select(taskSelection)
      .eq('user_id', userId)
      .eq('completed', false)
      .gte('due_date', range.startsOn)
      .lt('due_date', range.endsOn)
      .order('due_date')
      .order('due_time'),
    getEventsInRange(range),
    supabase
      .from('lists')
      .select('*')
      .eq('user_id', userId),
    getUserCategories(),
    getScheduledTasks(supabase, userId, range),
  ])

  if (dueTasks.error) throw new Error(dueTasks.error.message)
  if (lists.error) throw new Error(lists.error.message)

  return {
    dueTasks: dueTasks.data.map(toTaskWithList),
    scheduledTasks,
    events,
    lists: lists.data.map(toList),
    categories,
  }
}

async function materializeCalendarRecurringTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  range: ReturnType<typeof validateCalendarRange>,
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, recurrence_rule')
    .eq('user_id', userId)
    .eq('completed', false)
    .not('recurrence_rule', 'is', null)
  if (error) throw new Error(error.message)

  await materializeRecurringSessions(
    supabase,
    userId,
    data,
    range.startsOn,
    range.endsOn,
  )
}

/** Loads non-recurring and already-materialized items without waiting on recurrence expansion. */
export async function getCalendarBaseData(input: CalendarRangeInput) {
  const range = validateCalendarRange(input)
  const { supabase, user } = await authenticatedCalendarContext()
  return queryCalendarBaseData(supabase, user.id, range)
}

/** Materializes recurring task sessions and returns the complete scheduled range. */
export async function getRecurringCalendarData(input: CalendarRangeInput) {
  const range = validateCalendarRange(input)
  const { supabase, user } = await authenticatedCalendarContext()
  await materializeCalendarRecurringTasks(supabase, user.id, range)
  return { scheduledTasks: await getScheduledTasks(supabase, user.id, range) }
}

export async function getCalendarRangeData(input: CalendarRangeInput) {
  const range = validateCalendarRange(input)
  const { supabase, user } = await authenticatedCalendarContext()
  const base = await queryCalendarBaseData(supabase, user.id, range)
  await materializeCalendarRecurringTasks(supabase, user.id, range)
  return {
    ...base,
    scheduledTasks: await getScheduledTasks(supabase, user.id, range),
  }
}
