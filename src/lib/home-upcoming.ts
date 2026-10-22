import { format } from 'date-fns'
import type {
  CalendarEventWithList,
  Category,
  TaskOccurrence,
  TaskWithList,
} from '../types'
import {
  filterHomeEvents,
  HOME_UPCOMING_DAYS,
  type HomeSourcePreferences,
} from './home.ts'
import { addCalendarDays, calendarDaysBetween } from './today.ts'
import { nextOccurrenceDate } from './recurrence.ts'

function eventLocalParts(event: CalendarEventWithList) {
  if (!event.starts_at) return { date: event.starts_on, time: null }
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZone: event.time_zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(event.starts_at))
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

export type UpcomingSectionKey = 'overdue' | 'today' | 'week'

export type UpcomingTaskEntry = {
  kind: 'task'
  task: TaskWithList
  section: UpcomingSectionKey
  label: string
  time: string | null
  sortKey: string
  tieBreak: number
}

export type UpcomingEventEntry = {
  kind: 'event'
  event: CalendarEventWithList
  section: UpcomingSectionKey
  label: string
  time: string | null
  sortKey: string
  tieBreak: number
}

export type UpcomingEntry = UpcomingTaskEntry | UpcomingEventEntry

export const UPCOMING_SECTION_LABELS: Record<UpcomingSectionKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'Coming up this week',
}

function upcomingSectionForDate(
  dateKey: string,
  day: string,
): UpcomingSectionKey {
  if (dateKey < day) return 'overdue'
  return dateKey === day ? 'today' : 'week'
}

function formatUpcomingTime(value: string | null) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatUpcomingDay(dateKey: string) {
  return format(new Date(`${dateKey}T12:00:00`), 'EEE')
}

function formatOverdueLabel(dateKey: string, day: string) {
  const daysLate = Math.abs(calendarDaysBetween(day, dateKey))
  return `${daysLate} day${daysLate === 1 ? '' : 's'} late`
}

/** Shared Home projection. Events must already have recurrence exceptions expanded by the data layer. */
export function getHomeUpcomingEntries({
  tasks,
  orderedTasks = tasks,
  currentOccurrences,
  upcomingEvents,
  categories,
  preferences,
  day,
  currentTime,
}: {
  tasks: TaskWithList[]
  orderedTasks?: TaskWithList[]
  currentOccurrences: TaskOccurrence[]
  upcomingEvents: CalendarEventWithList[]
  categories: Category[]
  preferences: HomeSourcePreferences
  day: string
  currentTime: number | null
}): UpcomingEntry[] {
  const upcomingEnd = addCalendarDays(day, HOME_UPCOMING_DAYS)
  const taskEntries: UpcomingTaskEntry[] = []
  const taskOrder = new Map(
    orderedTasks
      .filter((task) => !task.completed && !task.stashed)
      .map((task, index) => [task.id, index]),
  )

  for (const task of tasks) {
    if (task.completed || task.stashed) continue

    const current = task.recurrence_rule
      ? currentOccurrences.find((occurrence) => occurrence.task_id === task.id)
      : null
    const dateKey = task.recurrence_rule
      ? current && !current.completed && !current.skipped
        ? day
        : nextOccurrenceDate(task.recurrence_rule, day)
      : task.due_date
    if (!dateKey || dateKey >= upcomingEnd) continue

    const section = upcomingSectionForDate(dateKey, day)
    const time = formatUpcomingTime(task.due_time)
    taskEntries.push({
      kind: 'task',
      task,
      section,
      label:
        section === 'overdue'
          ? formatOverdueLabel(dateKey, day)
          : section === 'today'
            ? 'Today'
            : formatUpcomingDay(dateKey),
      time,
      sortKey: `${dateKey}T${task.due_time ?? '23:59:59'}`,
      tieBreak: taskOrder.get(task.id) ?? 0,
    })
  }

  // The clock effect runs immediately after the first client render. Until
  // then, keep timed events out rather than treating every instant as future.
  const now = currentTime ?? Number.POSITIVE_INFINITY
  const eventSeries = new Map<string, CalendarEventWithList>()
  for (const event of filterHomeEvents(
    upcomingEvents,
    preferences,
    categories,
  )) {
    const parts = eventLocalParts(event)
    const startsOn = event.all_day ? event.starts_on : parts.date
    const start = event.starts_at ? Date.parse(event.starts_at) : Number.NaN
    const end = event.ends_at ? Date.parse(event.ends_at) : Number.NaN
    const isOngoing = event.all_day
      ? Boolean(
          event.starts_on &&
            event.ends_on &&
            event.starts_on < day &&
            event.ends_on > day,
        )
      : Number.isFinite(start) &&
        start <= now &&
        (!Number.isFinite(end) || end > now)
    const isUpcoming = event.all_day
      ? Boolean(startsOn && startsOn >= day && startsOn < upcomingEnd)
      : Number.isFinite(start) &&
        start >= now &&
        Boolean(startsOn && startsOn < upcomingEnd)
    if (!isOngoing && !isUpcoming) continue

    const seriesId = event.source_event_id ?? event.id
    const existing = eventSeries.get(seriesId)
    if (!existing) {
      eventSeries.set(seriesId, event)
      continue
    }

    const eventSortKey = event.all_day
      ? `${event.starts_on ?? '9999-12-31'}T00:00`
      : (event.starts_at ?? '9999-12-31T23:59:59.999Z')
    const existingSortKey = existing.all_day
      ? `${existing.starts_on ?? '9999-12-31'}T00:00`
      : (existing.starts_at ?? '9999-12-31T23:59:59.999Z')
    if (eventSortKey < existingSortKey) eventSeries.set(seriesId, event)
  }
  const eventEntries: UpcomingEventEntry[] = Array.from(
    eventSeries.values(),
  ).flatMap((event, index) => {
    const parts = eventLocalParts(event)
    const startsOn = event.all_day ? event.starts_on : parts.date
    const time = event.all_day ? null : parts.time
    const displayDate = startsOn && startsOn < day ? day : startsOn
    if (!displayDate || displayDate >= upcomingEnd) return []
    const section = upcomingSectionForDate(displayDate, day)
    return [
      {
        kind: 'event' as const,
        event,
        section,
        label: section === 'today' ? 'Today' : formatUpcomingDay(displayDate),
        time,
        sortKey: `${displayDate}T${time ?? '00:00'}`,
        tieBreak: tasks.length + index,
      },
    ]
  })
  return [...taskEntries, ...eventEntries].sort(
    (left, right) =>
      left.sortKey.localeCompare(right.sortKey) ||
      left.tieBreak - right.tieBreak,
  )
}
