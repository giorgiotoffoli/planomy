'use client'

import * as actions from './actions'

export const TASKS_CHANGED = 'planomy:tasks-changed'

export function notifyTasksChanged() {
  window.dispatchEvent(new Event(TASKS_CHANGED))
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
export const updateTaskCompleted = notifying(actions.updateTaskCompleted)
export const renameTask = notifying(actions.renameTask)
export const updateTaskDueDate = notifying(actions.updateTaskDueDate)
export const updateTaskNotes = notifying(actions.updateTaskNotes)
export const deleteTask = notifying(actions.deleteTask)
export const moveTask = notifying(actions.moveTask)
export const changeTaskStatus = notifying(actions.changeTaskStatus)
export const reorderTasks = notifying(actions.reorderTasks)
