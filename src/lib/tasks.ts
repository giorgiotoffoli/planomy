import type { ListSummary, TaskWithList } from '@/types'

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
    list: change.listId
      ? lists.find((list) => list.id === change.listId) ?? null
      : null,
  }
}
