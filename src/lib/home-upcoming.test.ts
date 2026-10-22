import assert from 'node:assert/strict'
import test from 'node:test'
import { getHomeUpcomingEntries } from './home-upcoming.ts'
import { defaultHomeSourcePreferences } from './home.ts'
import type { CalendarEventWithList, TaskWithList } from '../types'

const day = '2026-11-01' // DST fallback in America/Chicago.
function task(id: string, overrides: Partial<TaskWithList> = {}): TaskWithList {
  return {
    id,
    user_id: 'user',
    title: id,
    list_id: null,
    list: null,
    position: 0,
    focused: false,
    stashed: false,
    completed: false,
    due_date: null,
    due_time: null,
    ...overrides,
  }
}
function event(
  id: string,
  overrides: Partial<CalendarEventWithList> = {},
): CalendarEventWithList {
  return {
    id,
    user_id: 'user',
    title: id,
    list_id: null,
    list: null,
    all_day: false,
    starts_at: '2026-11-01T17:00:00Z',
    ends_at: '2026-11-01T18:00:00Z',
    starts_on: null,
    ends_on: null,
    time_zone: 'America/Chicago',
    description: null,
    location: null,
    recurrence_rule: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}
function entries(
  tasks: TaskWithList[] = [],
  upcomingEvents: CalendarEventWithList[] = [],
  extra: Partial<Parameters<typeof getHomeUpcomingEntries>[0]> = {},
) {
  return getHomeUpcomingEntries({
    tasks,
    upcomingEvents,
    currentOccurrences: [],
    categories: [],
    preferences: defaultHomeSourcePreferences(),
    day,
    currentTime: Date.parse('2026-11-01T15:00:00Z'),
    ...extra,
  })
}

test('Upcoming uses date-only grouping and an exclusive seven-day boundary through DST', () => {
  const result = entries([
    task('late', { due_date: '2026-10-31' }),
    task('today', { due_date: day }),
    task('week', { due_date: '2026-11-07' }),
    task('outside', { due_date: '2026-11-08' }),
    task('stashed', { due_date: day, stashed: true }),
    task('completed', { due_date: day, completed: true }),
  ])
  assert.deepEqual(
    result.map((entry) => [
      entry.kind === 'task' ? entry.task.id : '',
      entry.section,
    ]),
    [
      ['late', 'overdue'],
      ['today', 'today'],
      ['week', 'week'],
    ],
  )
  assert.equal(result[0].label, '1 day late')
})

test('recurring task completion moves Upcoming to the next occurrence without completing its definition', () => {
  const recurring = task('daily', {
    recurrence_rule: { frequency: 'daily', startDate: day },
  })
  const current = {
    id: 'occurrence',
    task_id: 'daily',
    user_id: 'user',
    occurrence_date: day,
    completed: false,
    skipped: false,
    cancelled: false,
  }
  assert.equal(
    entries([recurring], [], { currentOccurrences: [current] })[0].section,
    'today',
  )
  assert.equal(
    entries([recurring], [], {
      currentOccurrences: [{ ...current, completed: true }],
    })[0].section,
    'week',
  )
})

test('events respect sources, hidden visibility, exclusive ends and one nearest event per series', () => {
  const result = entries(
    [],
    [
      event('past', {
        starts_at: '2026-11-01T12:00:00Z',
        ends_at: '2026-11-01T13:00:00Z',
      }),
      event('hidden', { show_in_upcoming: false }),
      event('excluded-list', { list_id: 'hidden' }),
      event('later', {
        source_event_id: 'series',
        starts_at: '2026-11-02T17:00:00Z',
      }),
      event('nearest', { source_event_id: 'series' }),
      event('ongoing', {
        all_day: true,
        starts_at: null,
        starts_on: '2026-10-31',
        ends_on: '2026-11-02',
      }),
      event('ended', {
        all_day: true,
        starts_at: null,
        starts_on: '2026-10-31',
        ends_on: day,
      }),
    ],
    {
      preferences: {
        ...defaultHomeSourcePreferences(),
        excludedHomeListIds: ['hidden'],
      },
    },
  )
  assert.deepEqual(
    result.map((entry) => (entry.kind === 'event' ? entry.event.id : '')),
    ['ongoing', 'nearest'],
  )
  assert.equal(result[1].time, '11:00')
  assert.equal(result[0].section, 'today')
})

test('a timed event uses its configured zone rather than the device UTC date', () => {
  const result = entries(
    [],
    [event('midnight', { starts_at: '2026-11-02T01:00:00Z', ends_at: null })],
  )
  assert.equal(result[0].section, 'today')
  assert.equal(result[0].time, '19:00')
})

test('Upcoming preserves supplied task order for equal deadlines', () => {
  const first = task('first', { due_date: day })
  const second = task('second', { due_date: day })
  assert.deepEqual(
    entries([first, second], [], { orderedTasks: [second, first] }).map(
      (entry) => (entry.kind === 'task' ? entry.task.id : ''),
    ),
    ['second', 'first'],
  )
})
