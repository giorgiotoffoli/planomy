import type { ListColor } from './list-colors'
import type { CalendarEventWithList, Category, CategorySummary, ListSummary, TaskWithList } from '@/types'

export type LiveMutationPhase = 'optimistic' | 'rollback'

export type ListMutation = {
  listId: string
  color?: ListColor
  title?: string
  emoji?: string | null
  phase?: LiveMutationPhase
}

export type TaskVisualMutation = {
  taskId: string
  listId?: string | null
  categoryId?: string | null
  category?: CategorySummary | null
  occurrenceId?: string | null
  scope?: 'this' | 'following' | 'all'
  phase?: LiveMutationPhase
}

export type EventVisualMutation = {
  eventId: string
  sourceEventId?: string
  occurrenceKey?: string | null
  listId?: string | null
  categoryId?: string | null
  category?: CategorySummary | null
  color?: ListColor | null
  showInUpcoming?: boolean
  scope?: 'this' | 'following' | 'all'
  phase?: LiveMutationPhase
}

export type CategoryVisualMutation = {
  categoryId: string
  listId: string
  color?: ListColor | null
  phase?: LiveMutationPhase
}

export function applyListMutationToList<T extends ListSummary>(
  list: T,
  change: ListMutation,
): T {
  if (list.id !== change.listId) return list

  return {
    ...list,
    ...(change.color !== undefined ? { color: change.color } : {}),
    ...(change.title !== undefined ? { title: change.title } : {}),
    ...(change.emoji !== undefined ? { emoji: change.emoji } : {}),
  }
}

export function applyListMutationToTask(
  task: TaskWithList,
  change: ListMutation,
): TaskWithList {
  if (task.list_id !== change.listId || !task.list) return task

  return {
    ...task,
    list: applyListMutationToList(task.list, change),
  }
}

export function applyListMutationToEvent(
  event: CalendarEventWithList,
  change: ListMutation,
): CalendarEventWithList {
  if (event.list_id !== change.listId || !event.list) return event

  return {
    ...event,
    list: applyListMutationToList(event.list, change),
  }
}

function appliesToTask(task: TaskWithList, change: TaskVisualMutation) {
  return task.id === change.taskId
}

export function applyTaskVisualMutation(
  task: TaskWithList,
  change: TaskVisualMutation,
  lists: readonly ListSummary[],
): TaskWithList {
  if (!appliesToTask(task, change)) return task

  const nextListId = change.listId === undefined ? task.list_id : change.listId
  const nextList = nextListId
    ? lists.find((list) => list.id === nextListId) ?? task.list
    : null

  return {
    ...task,
    ...(change.listId !== undefined
      ? { list_id: nextListId, list: nextList }
      : {}),
    ...(change.categoryId !== undefined
      ? { category_id: change.categoryId, category: change.category ?? null }
      : {}),
  }
}

function appliesToEvent(
  event: CalendarEventWithList,
  change: EventVisualMutation,
) {
  if (change.scope === 'this' && change.occurrenceKey) {
    return event.occurrence_key === change.occurrenceKey
  }

  if (change.scope && change.scope !== 'this' && change.sourceEventId) {
    return event.source_event_id === change.sourceEventId
  }

  return event.id === change.eventId
}

export function applyEventVisualMutation(
  event: CalendarEventWithList,
  change: EventVisualMutation,
  lists: readonly ListSummary[],
): CalendarEventWithList {
  if (!appliesToEvent(event, change)) return event

  const nextListId = change.listId === undefined ? event.list_id : change.listId
  const nextList = nextListId
    ? lists.find((list) => list.id === nextListId) ?? event.list
    : null

  return {
    ...event,
    ...(change.listId !== undefined
      ? { list_id: nextListId, list: nextList }
      : {}),
    ...(change.categoryId !== undefined
      ? { category_id: change.categoryId, category: change.category ?? null }
      : {}),
    ...(change.color !== undefined ? { color: change.color } : {}),
    ...(change.showInUpcoming !== undefined
      ? { show_in_upcoming: change.showInUpcoming }
      : {}),
  }
}

export function applyCategoryMutationToCategory(
  category: Category,
  change: CategoryVisualMutation,
): Category {
  if (category.id !== change.categoryId) return category
  return change.color === undefined ? category : { ...category, color: change.color }
}

function applyCategoryToSummary(
  summary: CategorySummary | null | undefined,
  change: CategoryVisualMutation,
) {
  if (change.color === undefined) return summary
  if (summary?.id === change.categoryId) return { ...summary, color: change.color }
  return { id: change.categoryId, list_id: change.listId, color: change.color }
}

export function applyCategoryMutationToTask(
  task: TaskWithList,
  change: CategoryVisualMutation,
): TaskWithList {
  if (task.category_id !== change.categoryId) return task
  return {
    ...task,
    category: applyCategoryToSummary(task.category, change),
  }
}

export function applyCategoryMutationToEvent(
  event: CalendarEventWithList,
  change: CategoryVisualMutation,
): CalendarEventWithList {
  if (event.category_id !== change.categoryId) return event
  return {
    ...event,
    category: applyCategoryToSummary(event.category, change),
  }
}

export function eventMutationAppliesToScheduledTask(
  occurrenceId: string | null | undefined,
  change: TaskVisualMutation,
) {
  if (change.scope === 'this' && change.occurrenceId) {
    return occurrenceId === change.occurrenceId
  }

  return change.scope !== 'this' || !change.occurrenceId
}
