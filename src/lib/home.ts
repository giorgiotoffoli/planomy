import { format } from 'date-fns'
import type { List, TaskWithList } from '@/types'
import {
  addCalendarDays,
  calendarDaysBetween,
  localDateKey,
} from './today.ts'

export const MAX_FOCUS_TASKS = 3
export const DUE_SOON_DAYS = 7

export type HomeSource =
  | { type: 'unsorted' }
  | { type: 'list'; listId: string }

export type HomeSourcePreferences = {
  excludedHomeListIds: string[]
  showUnsortedOnHome: boolean
}

export function defaultHomeSourcePreferences(): HomeSourcePreferences {
  return {
    excludedHomeListIds: [],
    showUnsortedOnHome: true,
  }
}

export function normalizeHomeSourcePreferences(
  value:
    | {
        excluded_home_list_ids?: string[] | null
        show_unsorted_on_home?: boolean | null
      }
    | null
    | undefined,
  listIds?: readonly string[],
): HomeSourcePreferences {
  const availableListIds = listIds ? new Set(listIds) : null
  const excludedHomeListIds = Array.from(
    new Set(value?.excluded_home_list_ids ?? []),
  ).filter((listId) => availableListIds?.has(listId) ?? true)

  return {
    excludedHomeListIds,
    showUnsortedOnHome: value?.show_unsorted_on_home ?? true,
  }
}

export function isHomeSourceEnabled(
  source: HomeSource,
  preferences: HomeSourcePreferences,
) {
  if (source.type === 'unsorted') return preferences.showUnsortedOnHome
  return !preferences.excludedHomeListIds.includes(source.listId)
}

export function setHomeSourceEnabled(
  preferences: HomeSourcePreferences,
  source: HomeSource,
  enabled: boolean,
): HomeSourcePreferences {
  if (source.type === 'unsorted') {
    return { ...preferences, showUnsortedOnHome: enabled }
  }

  const excludedHomeListIds = enabled
    ? preferences.excludedHomeListIds.filter((id) => id !== source.listId)
    : preferences.excludedHomeListIds.includes(source.listId)
      ? preferences.excludedHomeListIds
      : [...preferences.excludedHomeListIds, source.listId]

  return { ...preferences, excludedHomeListIds }
}

export function filterHomeTasks(
  tasks: TaskWithList[],
  preferences: HomeSourcePreferences,
) {
  const excludedHomeListIds = new Set(preferences.excludedHomeListIds)

  return tasks.filter((task) => {
    if (task.focused) return true

    return task.list_id === null
      ? preferences.showUnsortedOnHome
      : !excludedHomeListIds.has(task.list_id)
  })
}

export function getHomeSources(lists: Pick<List, 'id'>[]): HomeSource[] {
  return [
    { type: 'unsorted' },
    ...lists.map((list) => ({ type: 'list' as const, listId: list.id })),
  ]
}

export type HomeBuckets = {
  focus: TaskWithList[]
  dueSoon: TaskWithList[]
  tasks: TaskWithList[]
  stashed: TaskWithList[]
}

export function isDueSoon(task: TaskWithList, day = localDateKey()) {
  if (!task.due_date) return false

  return task.due_date <= addCalendarDays(day, DUE_SOON_DAYS)
}

function stableTaskOrder(a: TaskWithList, b: TaskWithList) {
  const positionOrder = a.position - b.position
  if (positionOrder !== 0) return positionOrder

  const createdOrder = (a.created_at ?? '').localeCompare(b.created_at ?? '')
  if (createdOrder !== 0) return createdOrder

  return a.id.localeCompare(b.id)
}

function dueDateOrder(a: TaskWithList, b: TaskWithList) {
  const dateOrder = (a.due_date ?? '').localeCompare(b.due_date ?? '')
  if (dateOrder !== 0) return dateOrder

  const timeOrder = (a.due_time ?? '99:99:99').localeCompare(
    b.due_time ?? '99:99:99',
  )
  if (timeOrder !== 0) return timeOrder

  return stableTaskOrder(a, b)
}

export function getHomeBuckets(
  input: TaskWithList[],
  day = localDateKey(),
): HomeBuckets {
  const focus: TaskWithList[] = []
  const dueSoon: TaskWithList[] = []
  const tasks: TaskWithList[] = []
  const stashed: TaskWithList[] = []

  for (const task of input) {
    if (task.completed) continue

    if (task.stashed) {
      stashed.push(task)
    } else if (task.focused) {
      focus.push(task)
    } else if (isDueSoon(task, day)) {
      dueSoon.push(task)
    } else {
      tasks.push(task)
    }
  }

  focus.sort(stableTaskOrder)
  dueSoon.sort(dueDateOrder)
  tasks.sort(stableTaskOrder)
  stashed.sort(stableTaskOrder)

  return { focus, dueSoon, tasks, stashed }
}

export function getDeadlineLabel(
  dueDate: string | null,
  day = localDateKey(),
) {
  if (!dueDate) return null

  const difference = calendarDaysBetween(day, dueDate)

  if (difference < 0) {
    const overdueDays = Math.abs(difference)
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
  }

  if (difference === 0) return 'Today'
  if (difference === 1) return 'Tomorrow'

  return format(new Date(`${dueDate}T12:00:00`), 'EEEE')
}

export function getDueTimeLabel(dueTime: string | null) {
  if (!dueTime) return null

  const [hours, minutes] = dueTime.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}
