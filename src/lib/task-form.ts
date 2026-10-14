import type { Category } from '@/types'
import { isDateKey } from './today.ts'
import { localTimeCandidates, MINUTE } from './agenda.ts'

export function normalizeDeadline(
  dueDate: string | null | undefined,
  dueTime: string | null | undefined,
) {
  if (!dueDate) return { dueDate: null, dueTime: null }
  if (!isDateKey(dueDate)) throw new Error('Choose a valid deadline date.')
  if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) {
    throw new Error('Choose a valid deadline time.')
  }
  return { dueDate, dueTime: dueTime || null }
}

export function categoryBelongsToList(
  categories: Category[],
  listId: string | null,
  categoryId: string | null,
) {
  return categoryId === null || (
    listId !== null && categories.some(
      (category) => category.id === categoryId && category.list_id === listId,
    )
  )
}

export function resolveLocalPlanTime(
  date: string,
  time: string,
  duration: number | null,
  occurrence = '',
) {
  if (duration !== null && (!Number.isFinite(duration) || duration < 15)) {
    throw new Error('Choose a plan time duration of at least 15 minutes.')
  }
  const candidates = localTimeCandidates(date, time)
  if (candidates.length === 0) {
    throw new Error('This local plan time does not exist. Choose another time.')
  }
  const chosen = candidates.length === 1
    ? candidates[0]
    : candidates.find((candidate) => String(candidate) === occurrence)
  if (chosen === undefined) {
    throw new Error('Choose which occurrence of this local time to use.')
  }
  return {
    startsAt: new Date(chosen).toISOString(),
    endsAt: duration === null
      ? null
      : new Date(chosen + duration * MINUTE).toISOString(),
  }
}
