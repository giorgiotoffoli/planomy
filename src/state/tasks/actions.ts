export const TASK_ACTIONS = {
    ADD: 'tasks/add',
    DELETE: 'tasks/delete',
    TOGGLE_COMPLETE: 'tasks/complete',
    RENAME: 'tasks/rename',
    SET_NOTE: 'tasks/note',
    SET_DATE: 'tasks/date',
  } as const
  
  export type TaskAction =
    | { type: typeof TASK_ACTIONS.ADD; title: string, currentListId?: string }
    | { type: typeof TASK_ACTIONS.DELETE; id?: string, currentListId?: string }
    | { type: typeof TASK_ACTIONS.TOGGLE_COMPLETE; id: string, completed: boolean}
    | { type: typeof TASK_ACTIONS.RENAME; id: string, newTitle: string}
    | { type: typeof TASK_ACTIONS.SET_NOTE; id: string, note: string}
    | { type: typeof TASK_ACTIONS.SET_DATE; id: string, date: string}
  