import type {
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceSession,
  TaskOccurrence,
  TimeBlock,
} from '@/types'
import { addCalendarDays, isDateKey } from './today.ts'

const DAY_MS = 24 * 60 * 60 * 1000

function dateFromKey(value: string) {
  if (!isDateKey(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

function weeksSince(start: Date, value: Date) {
  const startWeek = new Date(start)
  startWeek.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const valueWeek = new Date(value)
  valueWeek.setDate(value.getDate() - ((value.getDay() + 6) % 7))
  return Math.floor(daysBetween(startWeek, valueWeek) / 7)
}

function monthsSince(start: Date, value: Date) {
  return (value.getFullYear() - start.getFullYear()) * 12 +
    value.getMonth() - start.getMonth()
}

function validFrequency(value: unknown): value is RecurrenceFrequency {
  return ['daily', 'weekday', 'weekly', 'monthly', 'yearly', 'custom'].includes(value as string)
}

function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function normalizeScheduledSessions(value: unknown): RecurrenceSession[] | undefined {
  if (!Array.isArray(value)) return undefined
  const sessions = value.flatMap((session, index) => {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return []
    const candidate = session as Partial<RecurrenceSession>
    if (!validTime(candidate.startTime) || !validTimeZone(candidate.timeZone)) return []
    const duration = candidate.durationMinutes === null
      ? null
      : Number.isFinite(candidate.durationMinutes) && Number(candidate.durationMinutes) >= 15
        ? Math.round(Number(candidate.durationMinutes))
        : null
    return [{
      id: typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id.trim()
        : `session-${index + 1}`,
      startTime: candidate.startTime,
      durationMinutes: duration,
      timeZone: candidate.timeZone,
    }]
  })
  return sessions.length ? sessions : undefined
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function normalizeRecurrenceRule(
  value: RecurrenceRule | null | undefined,
): RecurrenceRule | null {
  if (!value || !validFrequency(value.frequency) || !isDateKey(value.startDate)) {
    return null
  }

  const interval = Math.max(1, Math.floor(value.interval ?? 1))
  const weekdays = value.weekdays?.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  const endDate = value.endDate && isDateKey(value.endDate) ? value.endDate : null
  const count = value.count && Number.isInteger(value.count) && value.count > 0
    ? value.count
    : null
  const scheduledSessions = normalizeScheduledSessions(value.scheduledSessions)

  return {
    frequency: value.frequency,
    startDate: value.startDate,
    interval,
    ...(weekdays?.length ? { weekdays: [...new Set(weekdays)].sort() } : {}),
    endDate,
    count,
    ...(scheduledSessions ? { scheduledSessions } : {}),
  }
}

function timeZoneParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function timeZoneOffsetMs(instant: number, timeZone: string) {
  const parts = timeZoneParts(instant, timeZone)
  const [year, month, day] = parts.date.split('-').map(Number)
  const [hour, minute] = parts.time.split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute) - instant
}

/** Resolve a local wall-clock value without assuming a fixed UTC offset. */
export function zonedDateTimeToInstant(
  date: string,
  time: string,
  timeZone: string,
) {
  if (!isDateKey(date) || !validTime(time) || !validTimeZone(timeZone)) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallClockMs = Date.UTC(year, month - 1, day, hour, minute)
  let guess = wallClockMs
  for (let index = 0; index < 4; index += 1) {
    const next = wallClockMs - timeZoneOffsetMs(guess, timeZone)
    if (next === guess) break
    guess = next
  }

  // A fall-back can produce two instants for one wall-clock value. Choosing
  // the earlier one is deterministic; users can still reschedule that one
  // occurrence if they need the later fold.
  for (let offset = -6 * 60; offset <= 6 * 60; offset += 1) {
    const candidate = guess + offset * 60_000
    const parts = timeZoneParts(candidate, timeZone)
    if (parts.date === date && parts.time === time) return new Date(candidate).toISOString()
  }

  // Spring-forward gaps have no exact instant. Move to the first valid local
  // time after the gap so the recurrence remains visible and actionable.
  for (let offset = 0; offset <= 6 * 60; offset += 1) {
    const candidate = guess + offset * 60_000
    const parts = timeZoneParts(candidate, timeZone)
    if (parts.date === date && `${parts.date}T${parts.time}` >= `${date}T${time}`) {
      return new Date(candidate).toISOString()
    }
  }
  return null
}

export function recurringSessionTimes(
  rule: RecurrenceRule,
  occurrenceDate: string,
) {
  const normalized = normalizeRecurrenceRule(rule)
  if (!normalized || !recurrenceMatchesDate(normalized, occurrenceDate)) return []
  return (normalized.scheduledSessions ?? []).flatMap((session, sessionIndex) => {
    const startsAt = zonedDateTimeToInstant(
      occurrenceDate,
      session.startTime,
      session.timeZone,
    )
    if (!startsAt) return []
    const start = Date.parse(startsAt)
    const endsAt = session.durationMinutes === null
      ? null
      : new Date(start + session.durationMinutes * 60_000).toISOString()
    return [{
      session,
      sessionIndex,
      startsAt,
      endsAt,
    }]
  })
}

export function recurrenceMatchesDate(rule: RecurrenceRule, value: string) {
  const normalized = normalizeRecurrenceRule(rule)
  const start = dateFromKey(normalized?.startDate ?? '')
  const date = dateFromKey(value)
  if (!normalized || !start || !date || date < start) return false
  if (normalized.endDate && value > normalized.endDate) return false

  const interval = normalized.interval ?? 1
  switch (normalized.frequency) {
    case 'daily':
      return daysBetween(start, date) % interval === 0
    case 'weekday':
      return date.getDay() !== 0 && date.getDay() !== 6 && daysBetween(start, date) >= 0
    case 'weekly': {
      const weekdays = normalized.weekdays?.length
        ? normalized.weekdays
        : [((start.getDay() + 6) % 7) + 1]
      return weekdays.includes(((date.getDay() + 6) % 7) + 1) && weeksSince(start, date) % interval === 0
    }
    case 'custom':
      if (normalized.weekdays?.length) {
        return normalized.weekdays.includes(((date.getDay() + 6) % 7) + 1) &&
          weeksSince(start, date) % interval === 0
      }
      return daysBetween(start, date) % interval === 0
    case 'monthly':
      return date.getDate() === start.getDate() && monthsSince(start, date) % interval === 0
    case 'yearly':
      return date.getMonth() === start.getMonth() && date.getDate() === start.getDate() &&
        (date.getFullYear() - start.getFullYear()) % interval === 0
  }
}

/** Generate local calendar dates without creating task rows for every future date. */
export function generateOccurrenceDateKeys(
  rule: RecurrenceRule,
  rangeStart: string,
  rangeEnd: string,
) {
  const start = dateFromKey(rangeStart)
  const end = dateFromKey(rangeEnd)
  if (!start || !end || start >= end) return []

  const normalized = normalizeRecurrenceRule(rule)
  if (!normalized) return []
  const result: string[] = []
  const seriesStart = dateFromKey(normalized.startDate)
  if (!seriesStart) return []
  let cursor = new Date(seriesStart < start ? seriesStart : start)
  let occurrenceCount = 0
  // A bounded local-date loop is deliberate: it handles DST changes without
  // converting date-only recurrence rules through UTC.
  while (cursor < end) {
    const key = dateKey(cursor)
    if (recurrenceMatchesDate(normalized, key)) {
      occurrenceCount += 1
      if ((!normalized.count || occurrenceCount <= normalized.count) && key >= rangeStart) {
        result.push(key)
      }
      if (normalized.count && occurrenceCount >= normalized.count) break
    }
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

export function recurrenceLabel(rule: RecurrenceRule | null | undefined) {
  const normalized = normalizeRecurrenceRule(rule)
  if (!normalized) return null
  switch (normalized.frequency) {
    case 'daily': return normalized.interval === 1 ? 'Every day' : `Every ${normalized.interval} days`
    case 'weekday': return 'Every weekday'
    case 'weekly': {
      const days = normalized.weekdays?.map((day) => WEEKDAY_NAMES[day - 1]).join(', ')
      const cadence = normalized.interval === 1 ? 'Every week' : `Every ${normalized.interval} weeks`
      return days ? `${cadence} on ${days}` : cadence
    }
    case 'monthly': return normalized.interval === 1 ? 'Every month' : `Every ${normalized.interval} months`
    case 'yearly': return normalized.interval === 1 ? 'Every year' : `Every ${normalized.interval} years`
    case 'custom': {
      const days = normalized.weekdays?.map((day) => WEEKDAY_NAMES[day - 1]).join(', ')
      if (days) return normalized.interval === 1
        ? `Every week on ${days}`
        : `Every ${normalized.interval} weeks on ${days}`
      return normalized.interval === 1 ? 'Custom repeat' : `Every ${normalized.interval} days`
    }
  }
}

export type SessionPhase = 'upcoming' | 'in-progress' | 'missed' | 'skipped' | 'completed'

export function sessionEndMs(session: Pick<TimeBlock, 'starts_at' | 'ends_at'>) {
  const start = Date.parse(session.starts_at)
  if (!Number.isFinite(start)) return Number.NaN
  return session.ends_at ? Date.parse(session.ends_at) : start + 15 * 60_000
}

export function isMissedSession(
  session: Pick<TimeBlock, 'starts_at' | 'ends_at' | 'status'>,
  taskCompleted: boolean,
  now = new Date(),
) {
  return !taskCompleted && session.status !== 'skipped' && sessionEndMs(session) <= now.getTime()
}

export function sessionPhase(
  session: Pick<TimeBlock, 'starts_at' | 'ends_at' | 'status'>,
  taskCompleted: boolean,
  now = new Date(),
): SessionPhase {
  if (taskCompleted) return 'completed'
  if (session.status === 'skipped') return 'skipped'
  if (isMissedSession(session, taskCompleted, now)) return 'missed'
  const start = Date.parse(session.starts_at)
  return start <= now.getTime() ? 'in-progress' : 'upcoming'
}

export function occurrenceIsActionable(occurrence: Pick<TaskOccurrence, 'completed' | 'skipped'>) {
  return !occurrence.completed && !occurrence.skipped
}

export function nextOccurrenceDate(rule: RecurrenceRule, fromDate: string) {
  const next = addCalendarDays(fromDate, 1)
  const end = addCalendarDays(next, 366 * Math.max(1, rule.interval ?? 1))
  return generateOccurrenceDateKeys(rule, next, end)[0] ?? null
}
