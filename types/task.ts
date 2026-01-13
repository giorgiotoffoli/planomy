export interface Task {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    dueTime?: string;
    listId?: string;
    note?: string;
}

export interface List {
    id: string;
    title: string;
    icon?: React.ElementType
}


// Tasks

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
  


// Lists

export const LIST_ACTIONS = {
    ADD: 'lists/add',
    DELETE: 'lists/delete',
    RENAME: 'lists/rename',
} as const

export type ListsAction =
| { type: typeof LIST_ACTIONS.ADD; title: string }
| { type: typeof LIST_ACTIONS.DELETE; listId: string }
| { type: typeof LIST_ACTIONS.RENAME; listId: string, newTitle: string}
