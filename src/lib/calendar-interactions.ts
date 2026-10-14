import { MINUTE, SLOT_MINUTES, dayBounds, localTimeCandidates, timeInput } from './agenda.ts'
import { localDateKey } from './today.ts'

export const DEFAULT_TASK_DISPLAY_MINUTES = SLOT_MINUTES

export type CalendarDraftRange = {
  startsAt: Date
  endsAt: Date | null
}

export function taskDisplayEnd(start: Date, end: Date | null) {
  return end ?? new Date(start.getTime() + DEFAULT_TASK_DISPLAY_MINUTES * MINUTE)
}

export function isSingleDayTimedRange(start: Date, end: Date | null) {
  if (!Number.isFinite(start.getTime()) || (end && !Number.isFinite(end.getTime()))) {
    return false
  }
  if (!end) return true
  if (end.getTime() - start.getTime() < SLOT_MINUTES * MINUTE) return false

  // The end is exclusive, so midnight still belongs to the preceding day.
  return localDateKey(start) === localDateKey(new Date(end.getTime() - 1))
}

export function clampTimedRangeToDay(start: Date, end: Date) {
  const { end: dayEnd } = dayBounds(localDateKey(start))
  const latestEnd = dayEnd
  const earliestEnd = start.getTime() + SLOT_MINUTES * MINUTE
  return new Date(Math.max(earliestEnd, Math.min(end.getTime(), latestEnd)))
}

export function localInputValue(date: Date) {
  return {
    date: localDateKey(date),
    time: timeInput(date.getTime()),
  }
}

export function resolveLocalCalendarTime(
  day: string,
  time: string,
  preferredInstant?: number,
) {
  const candidates = localTimeCandidates(day, time)
  if (candidates.length === 0) return null
  if (preferredInstant === undefined || candidates.length === 1) return candidates[0]

  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate - preferredInstant) < Math.abs(closest - preferredInstant)
      ? candidate
      : closest,
  )
}

export function durationEnd(start: Date, minutes: number): Date
export function durationEnd(start: Date, minutes: null): null
export function durationEnd(start: Date, minutes: number | null) {
  if (minutes === null) return null
  return clampTimedRangeToDay(
    start,
    new Date(start.getTime() + Math.max(SLOT_MINUTES, minutes) * MINUTE),
  )
}
