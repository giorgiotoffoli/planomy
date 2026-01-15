import type { List } from "./listsTypes"
import { LIST_ACTIONS, ListsAction } from "./ListsActions"

export function listsReducer(lists: List[], action: ListsAction): List[] {
    switch (action.type) {
      case LIST_ACTIONS.ADD: {
        if (action.title) {
          return [
            ...lists,
            {
              id: crypto.randomUUID(),
              title: action.title,
            },
          ]
        }
        return lists
      }
      case LIST_ACTIONS.DELETE: {
        return lists.filter((list) => list.id !== action.listId)
      }
      case LIST_ACTIONS.RENAME: {
        return lists.map((list) =>
          list.id === action.listId ? { ...list, title: action.newTitle } : list
        )
      }
      default:
        return lists
    }
  }