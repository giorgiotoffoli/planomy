import type { CreateEventInput } from '@/types'
import { isDateKey } from './today.ts'

const zonedInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/

function parseInstant(value: string, label: string) {
  const instant = Date.parse(value)
  if (!zonedInstant.test(value) || !Number.isFinite(instant)) {
    throw new Error(`Choose a valid ${label}.`)
  }
  return instant
}

export function normalizeEventFields(input: CreateEventInput) {
  const title = input.title.trim()
  if (!title) throw new Error('An event title is required.')

  if (input.allDay) {
    if (!isDateKey(input.startsOn) || !isDateKey(input.endsOn)) {
      throw new Error('Choose valid all-day event dates.')
    }
    if (input.endsOn <= input.startsOn) {
      throw new Error('An all-day event must end after it starts.')
    }
    return {
      title,
      list_id: input.listId || null,
      all_day: true as const,
      starts_at: null,
      ends_at: null,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
    }
  }

  const start = parseInstant(input.startsAt, 'event start time')
  const end = parseInstant(input.endsAt, 'event end time')
  if (end <= start) throw new Error('An event must end after it starts.')

  return {
    title,
    list_id: input.listId || null,
    all_day: false as const,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    starts_on: null,
    ends_on: null,
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
