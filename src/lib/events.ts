import type {
  CalendarEvent,
  CalendarEventWithList,
  CreateEventInput,
  EventOccurrenceException,
  RecurrenceRule,
} from '@/types'
import { generateOccurrenceDateKeys, normalizeRecurrenceRule, recurrenceMatchesDate, recurrenceWeekdayTime, zonedDateTimeToInstant } from './recurrence.ts'
import { addCalendarDays, isDateKey } from './today.ts'
import { normalizeItemColor } from './list-colors.ts'

const zonedInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/

function parseInstant(value: string, label: string) {
  const instant = Date.parse(value)
  if (!zonedInstant.test(value) || !Number.isFinite(instant)) {
    throw new Error(`Choose a valid ${label}.`)
  }
  return instant
}

function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function trimmedOptional(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed || null
}

function eventRecurrence(value: RecurrenceRule | null | undefined) {
  if (value === null || value === undefined) return null
  const normalized = normalizeRecurrenceRule(value)
  if (!normalized) throw new Error('Choose a valid repeat rule.')
  return normalized
}

export function normalizeEventFields(input: CreateEventInput) {
  const title = input.title.trim()
  if (!title) throw new Error('An event title is required.')

  const timeZone = input.timeZone?.trim() || 'UTC'
  if (!validTimeZone(timeZone)) throw new Error('Choose a valid event time zone.')
  const recurrenceRule = eventRecurrence(input.recurrenceRule)

  if (input.allDay) {
    if (!isDateKey(input.startsOn) || !isDateKey(input.endsOn)) {
      throw new Error('Choose valid all-day event dates.')
    }
    if (input.endsOn <= input.startsOn) {
      throw new Error('An all-day event must end after it starts.')
    }
    return {
      title,
      description: trimmedOptional(input.description),
      location: trimmedOptional(input.location),
      list_id: input.listId || null,
      category_id: input.categoryId || null,
      color: normalizeItemColor(input.color),
      all_day: true as const,
      starts_at: null,
      ends_at: null,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      time_zone: timeZone,
      recurrence_rule: recurrenceRule,
      show_in_upcoming: input.showInUpcoming ?? true,
    }
  }

  const start = parseInstant(input.startsAt, 'event start time')
  const end = input.endsAt ? parseInstant(input.endsAt, 'event end time') : null
  if (end !== null && end <= start) throw new Error('An event must end after it starts.')
  if (recurrenceRule && !isDateKey(recurrenceRule.startDate)) {
    throw new Error('Choose a valid repeat start date.')
  }

  return {
    title,
    description: trimmedOptional(input.description),
    location: trimmedOptional(input.location),
    list_id: input.listId || null,
    category_id: input.categoryId || null,
    color: normalizeItemColor(input.color),
    all_day: false as const,
    starts_at: input.startsAt,
    ends_at: input.endsAt || null,
    starts_on: null,
    ends_on: null,
    time_zone: timeZone,
    recurrence_rule: recurrenceRule,
    show_in_upcoming: input.showInUpcoming ?? true,
  }
}

export type CalendarRangeInput = {
  startsAt: string
  endsAt: string
  startsOn: string
  endsOn: string
}

export function validateCalendarRange(input: CalendarRangeInput) {
  const start = parseInstant(input.startsAt, 'Calendar range start')
  const end = parseInstant(input.endsAt, 'Calendar range end')
  if (end <= start || end - start > 50 * 24 * 60 * 60_000) {
    throw new Error('Request a Calendar range of no more than 50 days.')
  }
  if (
    !isDateKey(input.startsOn) ||
    !isDateKey(input.endsOn) ||
    input.endsOn <= input.startsOn
  ) {
    throw new Error('Choose a valid Calendar date range.')
  }
  return input
}

export function localDateAndTime(instant: string, timeZone: string) {
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
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function eventOccurrenceKey(event: CalendarEvent, dateKey: string) {
  return event.all_day ? dateKey : `${dateKey}|${event.time_zone}`
}

function overlapsRange(event: CalendarEvent, range: CalendarRangeInput) {
  if (event.all_day) {
    return Boolean(event.starts_on && event.ends_on && event.starts_on < range.endsOn && event.ends_on > range.startsOn)
  }
  if (!event.starts_at) return false
  const start = Date.parse(event.starts_at)
  if (!Number.isFinite(start)) return false
  const end = event.ends_at ? Date.parse(event.ends_at) : start
  const rangeStart = Date.parse(range.startsAt)
  const rangeEnd = Date.parse(range.endsAt)
  return event.ends_at
    ? start < rangeEnd && end > rangeStart
    : start >= rangeStart && start < rangeEnd
}

function applyException(
  occurrence: CalendarEvent,
  exception: EventOccurrenceException | undefined,
) {
  if (!exception) return occurrence
  if (exception.cancelled) return null
  return {
    ...occurrence,
    title: exception.title ?? occurrence.title,
    description: exception.description,
    location: exception.location,
    time_zone: exception.time_zone ?? occurrence.time_zone,
    list_id: exception.list_id,
    category_id: exception.category_id,
    category: exception.category ?? null,
    // A nullable exception color intentionally resets this occurrence to the
    // inherited Category/List color instead of restoring the series override.
    color: exception.color,
    all_day: exception.all_day ?? occurrence.all_day,
    starts_at: exception.starts_at,
    ends_at: exception.ends_at,
    starts_on: exception.starts_on,
    ends_on: exception.ends_on,
    show_in_upcoming: exception.show_in_upcoming ?? occurrence.show_in_upcoming ?? true,
  }
}

function occurrenceFromDate(
  event: CalendarEvent,
  dateKey: string,
  exception?: EventOccurrenceException,
): CalendarEvent | null {
  const rule = event.recurrence_rule
  if (!rule) return event
  const key = eventOccurrenceKey(event, dateKey)
  if (event.all_day) {
    const length = event.starts_on && event.ends_on
      ? Math.max(1, Math.round((Date.parse(`${event.ends_on}T00:00:00Z`) - Date.parse(`${event.starts_on}T00:00:00Z`)) / 86_400_000))
      : 1
    const occurrence: CalendarEvent = {
      ...event,
      id: `${event.id}:${key}`,
      source_event_id: event.id,
      occurrence_key: key,
      starts_on: dateKey,
      ends_on: addCalendarDays(dateKey, length),
    }
    return applyException(occurrence, exception)
  }

  if (!event.starts_at) return null
  const local = localDateAndTime(event.starts_at, event.time_zone)
  const weekdayTime = recurrenceWeekdayTime(rule, dateKey)
  const startsAt = zonedDateTimeToInstant(
    dateKey,
    weekdayTime?.startTime ?? local.time,
    event.time_zone,
  )
  if (!startsAt) return null
  const baseStart = Date.parse(event.starts_at)
  const baseEnd = event.ends_at ? Date.parse(event.ends_at) : null
  const duration = weekdayTime
    ? weekdayTime.durationMinutes === null ? null : weekdayTime.durationMinutes * 60_000
    : baseEnd === null ? null : Math.max(0, baseEnd - baseStart)
  const occurrence: CalendarEvent = {
    ...event,
    id: `${event.id}:${key}`,
    source_event_id: event.id,
    occurrence_key: key,
    starts_at: startsAt,
    ends_at: duration === null ? null : new Date(Date.parse(startsAt) + duration).toISOString(),
  }
  return applyException(occurrence, exception)
}

/** Expand only the visible part of a series; the database keeps one series row. */
export function expandCalendarEvents(
  events: CalendarEventWithList[],
  exceptions: EventOccurrenceException[],
  range: CalendarRangeInput,
) {
  const exceptionByKey = new Map(
    exceptions.map((exception) => [`${exception.event_id}:${exception.occurrence_key}`, exception]),
  )
  const expanded: CalendarEventWithList[] = []
  for (const event of events) {
    if (!event.recurrence_rule) {
      if (overlapsRange(event, range)) expanded.push(event)
      continue
    }

    const rule = normalizeRecurrenceRule(event.recurrence_rule)
    if (!rule) continue
    const keys = generateOccurrenceDateKeys(rule, range.startsOn, range.endsOn)
    for (const dateKey of keys) {
      const key = eventOccurrenceKey(event, dateKey)
      const occurrence = occurrenceFromDate(event, dateKey, exceptionByKey.get(`${event.id}:${key}`))
      if (occurrence && overlapsRange(occurrence, range)) expanded.push({ ...occurrence, list: event.list, category: occurrence.category ?? event.category })
    }
  }
  return expanded
}

export function isRecurringEvent(event: Pick<CalendarEvent, 'recurrence_rule'>) {
  return Boolean(event.recurrence_rule && recurrenceMatchesDate(event.recurrence_rule, event.recurrence_rule.startDate))
}
