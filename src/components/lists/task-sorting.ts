import type { TaskWithList } from '@/types'

export const taskSortOptions = [
  'manual',
  'created-asc',
  'created-desc',
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

        if (comparison === 0) {
          // Tasks on the same date use their scheduled time as a tiebreaker.
          // Tasks without a time remain after timed tasks in either direction.
          if (!left.task.due_time && !right.task.due_time) {
            return left.index - right.index
          }
          if (!left.task.due_time) return 1
          if (!right.task.due_time) return -1

          comparison = left.task.due_time.localeCompare(right.task.due_time)
        }
      } else if (sortOption.startsWith('created')) {
        // Tasks without a creation timestamp always follow dated tasks.
        if (!left.task.created_at && !right.task.created_at) {
          return left.index - right.index
        }
        if (!left.task.created_at) return 1
        if (!right.task.created_at) return -1

        comparison = left.task.created_at.localeCompare(right.task.created_at)
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
