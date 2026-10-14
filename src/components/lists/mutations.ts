export const LISTS_CHANGED = 'planomy:lists-changed'

export function notifyListsChanged() {
  window.dispatchEvent(new Event(LISTS_CHANGED))
}
