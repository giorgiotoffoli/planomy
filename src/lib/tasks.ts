import type { CategorySummary, ListSummary, TaskWithList } from '@/types'

export function matchesTaskSearch(task: TaskWithList, searchQuery: string) {
  const query = searchQuery.trim().toLocaleLowerCase()
  return !query || [task.title, task.notes, task.list?.title].some(
    (value) => value?.toLocaleLowerCase().includes(query),
  )
}

export type TaskOrganizationChange = {
  taskId: string
  listId: string | null
  categoryId: string | null
  category?: CategorySummary | null
}

export function applyTaskOrganizationChange(
  task: TaskWithList,
  lists: readonly ListSummary[],
  change: TaskOrganizationChange,
): TaskWithList {
  if (task.id !== change.taskId) return task

  return {
    ...task,
    list_id: change.listId,
    category_id: change.categoryId,
    category: change.categoryId === null ? null : change.category ?? task.category ?? null,
    list: change.listId
      ? lists.find((list) => list.id === change.listId) ?? null
      : null,
  }
}
