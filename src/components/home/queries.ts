'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toList, toTaskWithList } from '@/lib/supabase/domain-mappers'
import { getUserCategories } from '@/components/categories/queries'
import { normalizeHomeSourcePreferences } from '@/lib/home'
import {
  isMissedSession,
} from '@/lib/recurrence'
import { addCalendarDays, isDateKey, localDateKey } from '@/lib/today'
import { toAgendaBlock } from '@/lib/supabase/domain-mappers'
import { materializeRecurringSessions } from '@/lib/recurring-sessions'
import type { NeedsAttentionItem, TaskOccurrence, TaskWithList } from '@/types'

const scheduledSelection =
  '*, occurrence:task_occurrences!task_time_blocks_owned_occurrence(*), task:tasks!task_time_blocks_owned_task(*, list:lists(id, title, emoji, default_view, color))' as const

type HomeDataInput = {
  today?: string
  now?: string
}

function queryDate(input?: string) {
  return input && isDateKey(input) ? input : localDateKey()
}

function queryNow(input?: string) {
  const parsed = input ? Date.parse(input) : Number.NaN
  return Number.isFinite(parsed) ? new Date(parsed) : new Date()
}

async function loadRecurrenceState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tasks: TaskWithList[],
  today: string,
  now: Date,
) {
  const lookback = addCalendarDays(today, -30)
  const tomorrow = addCalendarDays(today, 1)
  const recurringTasks = tasks.filter((task) => task.recurrence_rule)

  await materializeRecurringSessions(
    supabase,
    userId,
    recurringTasks.map((task) => ({ id: task.id, recurrence_rule: task.recurrence_rule })),
    lookback,
    tomorrow,
  )

  const [{ data: occurrences, error: occurrencesError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      supabase
        .from('task_occurrences')
        .select('*')
        .eq('user_id', userId)
        .gte('occurrence_date', lookback)
        .lt('occurrence_date', tomorrow)
        .order('occurrence_date'),
      supabase
        .from('task_time_blocks')
        .select(scheduledSelection)
        .eq('user_id', userId)
        .lt('starts_at', now.toISOString())
        .order('starts_at'),
    ])

  if (occurrencesError) throw new Error(occurrencesError.message)
  if (blocksError) throw new Error(blocksError.message)

  const mappedOccurrences = occurrences as TaskOccurrence[]
  const mappedBlocks = blocks.map(toAgendaBlock)
  const scheduledOccurrenceIds = new Set(
    mappedBlocks
      .map((block) => block.occurrence_id)
      .filter((id): id is string => Boolean(id)),
  )
  const missedSessions: NeedsAttentionItem[] = mappedBlocks
    .filter((block) => block.id && block.task && isMissedSession(block, block.task.completed, now))
    .map((block) => ({
      id: `session:${block.id}`,
      kind: 'missed-session' as const,
      task: block.task,
      session: {
        id: block.id,
        task_id: block.task_id,
        user_id: block.user_id,
        starts_at: block.starts_at,
        ends_at: block.ends_at,
        occurrence_id: block.occurrence_id,
        status: block.status,
        created_at: block.created_at,
        updated_at: block.updated_at,
      },
      occurrences: [],
      occurredAt: block.starts_at,
    }))

  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const groupedMissedOccurrences = new Map<string, TaskOccurrence[]>()
  for (const occurrence of mappedOccurrences) {
    if (
      occurrence.occurrence_date >= today ||
      occurrence.completed ||
      occurrence.skipped ||
      scheduledOccurrenceIds.has(occurrence.id)
    ) continue
    const task = taskById.get(occurrence.task_id)
    if (!task || !task.recurrence_rule) continue
    const group = groupedMissedOccurrences.get(occurrence.task_id) ?? []
    group.push(occurrence)
    groupedMissedOccurrences.set(occurrence.task_id, group)
  }

  const missedOccurrences: NeedsAttentionItem[] = Array.from(
    groupedMissedOccurrences,
  ).map(([taskId, taskOccurrences]) => ({
    id: `occurrences:${taskId}`,
    kind: 'missed-occurrence' as const,
    task: taskById.get(taskId)!,
    session: null,
    occurrences: taskOccurrences,
    occurredAt: `${taskOccurrences[0].occurrence_date}T12:00:00`,
  }))

  return {
    currentOccurrences: mappedOccurrences.filter(
      (occurrence) => occurrence.occurrence_date === today,
    ),
    attention: [...missedSessions, ...missedOccurrences].sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    ),
  }
}

export async function getHomeData(input: HomeDataInput = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const [
    { data: tasks, error: tasksError },
    { data: lists, error: listsError },
    categories,
    { data: homePreferences, error: homePreferencesError },
  ] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, list:lists (title, id, emoji, default_view, color)')
        .eq('user_id', user.id)
        .is('completed', false)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('title', { ascending: true }),
      getUserCategories(),
      supabase
        .from('user_preferences')
        .select(
          'excluded_home_list_ids, excluded_home_category_ids, included_home_category_ids, show_unsorted_on_home',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
  ])

  if (tasksError) throw new Error(tasksError.message)
  if (listsError) throw new Error(listsError.message)
  if (homePreferencesError) throw new Error(homePreferencesError.message)

  const mappedLists = lists.map(toList)
  const mappedTasks = tasks.map(toTaskWithList)
  const recurrenceState = await loadRecurrenceState(
    supabase,
    user.id,
    mappedTasks,
    queryDate(input.today),
    queryNow(input.now),
  )

  return {
    tasks: mappedTasks,
    lists: mappedLists,
    categories,
    ...recurrenceState,
    homePreferences: normalizeHomeSourcePreferences(
      homePreferences,
      mappedLists.map((list) => list.id),
      categories.map((category) => category.id),
      categories,
    ),
  }
}

export async function getNeedsAttention(input: HomeDataInput = {}) {
  const data = await getHomeData(input)
  return data.attention
}
