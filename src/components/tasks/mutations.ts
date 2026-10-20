'use client'

import type { TaskOrganizationChange } from '@/lib/tasks'
import type { TaskVisualMutation } from '@/lib/live-mutations'
import * as actions from './actions'

export const TASKS_CHANGED = 'planomy:tasks-changed'
export const TASK_ORGANIZATION_CHANGED = 'planomy:task-organization-changed'

export function notifyTasksChanged(change?: TaskVisualMutation) {
  window.dispatchEvent(new CustomEvent<TaskVisualMutation | undefined>(TASKS_CHANGED, {
    detail: change,
  }))
}

export function taskVisualMutationFromEvent(
  event: Event,
): TaskVisualMutation | null {
  if (!(event instanceof CustomEvent)) return null
  const change = event.detail as TaskVisualMutation | undefined
  return change && typeof change.taskId === 'string' ? change : null
}

export function notifyTaskOrganizationChanged(
  change: TaskOrganizationChange,
) {
  window.dispatchEvent(
    new CustomEvent<TaskOrganizationChange>(TASK_ORGANIZATION_CHANGED, {
      detail: change,
    }),
  )
}

export function taskOrganizationChangeFromEvent(
  event: Event,
): TaskOrganizationChange | null {
  if (!(event instanceof CustomEvent)) return null

  const change = event.detail as Partial<TaskOrganizationChange> | undefined
  if (
    !change ||
    typeof change.taskId !== 'string' ||
    (change.listId !== null && typeof change.listId !== 'string') ||
    (change.categoryId !== null && typeof change.categoryId !== 'string')
  ) {
    return null
  }

  return change as TaskOrganizationChange
}

// A notification contains no decrypted content. Each consumer reloads its own data.
function notifying<Args extends unknown[], Result>(operation: (...args: Args) => Promise<Result>) {
  return async (...args: Args) => {
    const result = await operation(...args)
    notifyTasksChanged()
    return result
  }
}
export const createTask = notifying(actions.createTask)
export const updateTask = notifying(actions.updateTask)
export const updateTaskCompleted = notifying(actions.updateTaskCompleted)
export const renameTask = notifying(actions.renameTask)
export const updateTaskDueDate = notifying(actions.updateTaskDueDate)
export const updateTaskNotes = notifying(actions.updateTaskNotes)
export const deleteTask = notifying(actions.deleteTask)
export const moveTask = notifying(actions.moveTask)
export const changeTaskCategory = notifying(actions.changeTaskCategory)
export const reorderTasks = notifying(actions.reorderTasks)
