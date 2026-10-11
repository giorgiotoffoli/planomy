export const MAX_DAILY_FOCUS = 3

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Calendar arithmetic on date-only values; it never converts a local instant to UTC. */
export function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day - 1))
  return date.toISOString().slice(0, 10)
}

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function clearTaskFocusOnCompletion<
  T extends { task_id: string; focused: boolean },
>(selections: T[], taskId: string, completed: boolean) {
  if (!completed) return selections

  return selections.map((selection) =>
    selection.task_id === taskId && selection.focused
      ? { ...selection, focused: false }
      : selection,
  )
}
