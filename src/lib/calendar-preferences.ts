export type CalendarFirstDay = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type TimeFormat = '12h' | '24h'

export type CalendarPreferences = {
  firstDay: CalendarFirstDay
  timeFormat: TimeFormat
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  firstDay: 0,
  timeFormat: '24h',
}

export function normalizeCalendarPreferences(
  input: Partial<CalendarPreferences> | null | undefined,
): CalendarPreferences {
  const firstDay = input?.firstDay
  const timeFormat = input?.timeFormat

  return {
    firstDay:
      typeof firstDay === 'number' && Number.isInteger(firstDay) && firstDay >= 0 && firstDay <= 6
        ? firstDay as CalendarFirstDay
        : DEFAULT_CALENDAR_PREFERENCES.firstDay,
    timeFormat: timeFormat === '12h' || timeFormat === '24h'
      ? timeFormat
      : DEFAULT_CALENDAR_PREFERENCES.timeFormat,
  }
}

function asDate(value: string | number | Date) {
  return value instanceof Date ? value : new Date(value)
}

export function formatTime(value: string | number | Date, timeFormat: TimeFormat) {
  return asDate(value).toLocaleTimeString([], {
    hour: timeFormat === '12h' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  })
}

export function formatHour(value: string | number | Date, timeFormat: TimeFormat) {
  return asDate(value).toLocaleTimeString([], {
    hour: timeFormat === '12h' ? 'numeric' : '2-digit',
    hour12: timeFormat === '12h',
  })
}
