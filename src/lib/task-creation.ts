import type { Category, ListSummary, TaskWithList, TimeBlock } from '@/types'
import { isTaskVisibleOnHome, type HomeSourcePreferences } from './home.ts'
import { matchesTaskSearch } from './tasks.ts'

export type TaskCreationView =
  | { type: 'home'; preferences: HomeSourcePreferences; categories: Category[]; searchQuery: string }
  | { type: 'list'; listId: string }
  | { type: 'all' | 'completed' | 'deadlines' }
  | { type: 'today'; day: string }

/** Evaluate the saved task against the same filters used to render its view. */
export function isCreatedTaskVisible(task: TaskWithList, view?: TaskCreationView) {
  if (!view) return false
  switch (view.type) {
    case 'home':
      return !task.completed && !task.stashed &&
        isTaskVisibleOnHome(task, view.preferences, view.categories) &&
        matchesTaskSearch(task, view.searchQuery)
    case 'list':
      return !task.completed && task.list_id === view.listId
    case 'all':
      return !task.completed
    case 'completed':
      return task.completed
    case 'deadlines':
      return !task.completed && Boolean(task.due_date)
    case 'today':
      // Newly captured tasks are not selected for Today, but may be suggestions.
      return !task.completed && Boolean(task.due_date && task.due_date <= view.day)
  }
}

export function isCreatedScheduleVisible(
  block: Pick<TimeBlock, 'starts_at' | 'ends_at'>,
  range: { startsAt: string; endsAt: string } | null,
) {
  if (!range) return false
  const start = Date.parse(block.starts_at)
  const end = block.ends_at ? Date.parse(block.ends_at) : start + 15 * 60_000
  return start < Date.parse(range.endsAt) && end > Date.parse(range.startsAt)
}

export function taskCreationMessage(
  task: Pick<TaskWithList, 'list_id' | 'category_id'>,
  lists: readonly ListSummary[],
  categories: readonly Category[] = [],
) {
  const list = lists.find(({ id }) => id === task.list_id)
  const category = categories.find(
    ({ id, list_id }) => id === task.category_id && list_id === task.list_id,
  )
  const listLabel = list
    ? [list.emoji, list.title].filter(Boolean).join(' ')
    : null
  const destination = [listLabel, category?.title].filter(Boolean).join(' / ')
  return destination ? `Task added to ${destination}` : task.list_id ? 'Task added' : 'Task added to Unsorted'
}
