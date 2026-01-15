import { TaskAction, TASK_ACTIONS } from "./actions"
import { Task } from "./types"

 export function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
    switch (action.type) {
      case TASK_ACTIONS.ADD: {
        return [
          ...tasks,
          {
            id: crypto.randomUUID(),
            title: action.title,
            completed: false,
            listId: action.currentListId,
          },
        ]
      }
      case TASK_ACTIONS.DELETE: {
        if (!action.id) {
          return tasks.filter((t) => t.listId !== action.currentListId)
        }
        return tasks.filter((t) => t.id !== action.id)
      }
      case TASK_ACTIONS.TOGGLE_COMPLETE: {
        return tasks.map((t) =>
          t.id === action.id ? { ...t, completed: !action.completed } : t
        )
      }
      case TASK_ACTIONS.RENAME: {
        return tasks.map((t) =>
          t.id === action.id ? { ...t, title: action.newTitle } : t
        )
      }
      case TASK_ACTIONS.SET_NOTE: {
        return tasks.map((t) =>
          t.id === action.id ? { ...t, note: action.note } : t
        )
      }
      case TASK_ACTIONS.SET_DATE: {
        return tasks.map((t) =>
          t.id === action.id ? { ...t, dueDate: action.date } : t
        )
      }
      default: {
        console.log(`${action} is not a valid task action`)
        return tasks
      }
    }
  }
  