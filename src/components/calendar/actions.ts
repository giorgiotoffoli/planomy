'use server'

import { createClient } from '@/lib/supabase/server'
import { validateCalendarRange, type CalendarRangeInput } from '@/lib/events'
import { getUserCategories } from '@/components/categories/queries'
import {
  toAgendaBlock,
  toCalendarEvent,
  toList,
  toTaskWithList,
} from '@/lib/supabase/domain-mappers'

const taskSelection =
  '*, list:lists(id, title, emoji, default_view, color)' as const
const scheduledSelection =
  '*, task:tasks!task_time_blocks_owned_task(*, list:lists(id, title, emoji, default_view, color))' as const
const eventSelection =
  '*, list:lists(id, title, emoji, default_view, color)' as const

export async function getCalendarRangeData(input: CalendarRangeInput) {
  const range = validateCalendarRange(input)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const [dueTasks, scheduledTasks, timedEvents, allDayEvents, lists, categories] =
    await Promise.all([
      supabase
        .from('tasks')
        .select(taskSelection)
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('due_date', range.startsOn)
        .lt('due_date', range.endsOn)
        .order('due_date')
        .order('due_time'),
      supabase
        .from('task_time_blocks')
        .select(scheduledSelection)
        .eq('user_id', user.id)
        .lt('starts_at', range.endsAt)
        .or(
          `ends_at.gt.${range.startsAt},and(ends_at.is.null,starts_at.gte.${range.startsAt})`,
        )
        .order('starts_at'),
      supabase
        .from('events')
        .select(eventSelection)
        .eq('user_id', user.id)
        .eq('all_day', false)
        .lt('starts_at', range.endsAt)
        .gt('ends_at', range.startsAt)
        .order('starts_at'),
      supabase
        .from('events')
        .select(eventSelection)
        .eq('user_id', user.id)
        .eq('all_day', true)
        .lt('starts_on', range.endsOn)
        .gt('ends_on', range.startsOn)
        .order('starts_on'),
      supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id),
      getUserCategories(),
    ])

  if (dueTasks.error) throw new Error(dueTasks.error.message)
  if (scheduledTasks.error) throw new Error(scheduledTasks.error.message)
  if (timedEvents.error) throw new Error(timedEvents.error.message)
  if (allDayEvents.error) throw new Error(allDayEvents.error.message)
  if (lists.error) throw new Error(lists.error.message)

  return {
    dueTasks: dueTasks.data.map(toTaskWithList),
    scheduledTasks: scheduledTasks.data.map(toAgendaBlock),
    events: [...timedEvents.data, ...allDayEvents.data].map(toCalendarEvent),
    lists: lists.data.map(toList),
    categories,
  }
}
