import type { ListMutation } from '@/lib/live-mutations'

export const LISTS_CHANGED = 'planomy:lists-changed'

export function notifyListsChanged(change?: ListMutation) {
  window.dispatchEvent(new CustomEvent<ListMutation | undefined>(LISTS_CHANGED, {
    detail: change,
  }))
}

export function listMutationFromEvent(event: Event): ListMutation | null {
  if (!(event instanceof CustomEvent)) return null
  const change = event.detail as ListMutation | undefined
  return change && typeof change.listId === 'string' ? change : null
}
