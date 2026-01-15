export const LIST_ACTIONS = {
    ADD: 'lists/add',
    DELETE: 'lists/delete',
    RENAME: 'lists/rename',
} as const

export type ListsAction =
| { type: typeof LIST_ACTIONS.ADD; title: string }
| { type: typeof LIST_ACTIONS.DELETE; listId: string }
| { type: typeof LIST_ACTIONS.RENAME; listId: string, newTitle: string}
