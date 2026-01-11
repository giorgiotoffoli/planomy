export interface Task {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    dueTime?: string;
    list?: List;
    note?: string;
}

export interface List {
    id: string;
    title: string;
    icon?: React.ElementType
}

export const TASK_ACTIONS = {
    ADD: 'tasks/add',
    DELETE: 'tasks/delete',
    TOGGLE_COMPLETE: 'tasks/complete',
    RENAME: 'tasks/rename',
    SET_NOTE: 'tasks/note',
    SET_DATE: 'tasks/date',
  } as const
  
  export type TaskAction =
    | { type: typeof TASK_ACTIONS.ADD; title: string, currentList?: List }
    | { type: typeof TASK_ACTIONS.DELETE; id?: string, currentList?: List }
    | { type: typeof TASK_ACTIONS.TOGGLE_COMPLETE; id: string, completed: boolean}
    | { type: typeof TASK_ACTIONS.RENAME; id: string, newTitle: string}
    | { type: typeof TASK_ACTIONS.SET_NOTE; id: string, note: string}
    | { type: typeof TASK_ACTIONS.SET_DATE; id: string, date: string}
  