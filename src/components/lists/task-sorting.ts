import type { TaskWithList } from '@/types'

export const taskSortOptions = [
  'manual',
  'due-date-asc',
  'due-date-desc',
  'alphabetical-asc',
  'alphabetical-desc',
] as const

export type TaskSortOption = (typeof taskSortOptions)[number]

export function isTaskSortOption(value: string): value is TaskSortOption {
  return taskSortOptions.includes(value as TaskSortOption)
}

export function sortTasks(
  tasks: TaskWithList[],
  sortOption: TaskSortOption,
): TaskWithList[] {
  if (sortOption === 'manual') return tasks

  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      let comparison = 0

      if (sortOption.startsWith('due-date')) {
        // Undated tasks always follow dated tasks, regardless of direction.
        if (!left.task.due_date && !right.task.due_date) return left.index - right.index
        if (!left.task.due_date) return 1
        if (!right.task.due_date) return -1

        comparison = left.task.due_date.localeCompare(right.task.due_date)
      } else {
        comparison = left.task.title.localeCompare(right.task.title, undefined, {
          sensitivity: 'base',
          numeric: true,
        })
      }

      if (sortOption.endsWith('desc')) comparison *= -1

      return comparison || left.index - right.index
    })
    .map(({ task }) => task)
}
