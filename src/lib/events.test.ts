import assert from 'node:assert/strict'
import test from 'node:test'
import { expandCalendarEvents, normalizeEventFields, validateCalendarRange } from './events.ts'
import type { CalendarEventWithList } from '@/types'

test('timed events retain explicit instants', () => {
  assert.deepEqual(
    normalizeEventFields({
      title: 'encrypted-title',
      listId: 'school',
      allDay: false,
      startsAt: '2026-10-14T14:00:00-05:00',
      endsAt: '2026-10-14T15:00:00-05:00',
    }),
    {
      title: 'encrypted-title',
      description: null,
      location: null,
      list_id: 'school',
      category_id: null,
      color: null,
      all_day: false,
      starts_at: '2026-10-14T14:00:00-05:00',
      ends_at: '2026-10-14T15:00:00-05:00',
      starts_on: null,
      ends_on: null,
      time_zone: 'UTC',
      recurrence_rule: null,
      show_in_upcoming: true,
    },
  )
})

test('all-day events retain date-only exclusive boundaries', () => {
  const event = normalizeEventFields({
    title: 'encrypted-title',
    listId: null,
    allDay: true,
    startsOn: '2026-10-14',
    endsOn: '2026-10-16',
  })
  assert.equal(event.starts_on, '2026-10-14')
  assert.equal(event.ends_on, '2026-10-16')
  assert.equal(event.starts_at, null)
  assert.equal(event.ends_at, null)
  assert.equal(event.time_zone, 'UTC')
  assert.equal(event.recurrence_rule, null)
})

test('event and Calendar ranges reject inverted boundaries', () => {
  assert.throws(
    () => normalizeEventFields({
      title: 'event',
      listId: null,
      allDay: true,
      startsOn: '2026-10-14',
      endsOn: '2026-10-14',
    }),
    /end after/,
  )
  assert.throws(
    () => validateCalendarRange({
      startsAt: '2026-10-14T00:00:00-05:00',
      endsAt: '2026-12-14T00:00:00-06:00',
      startsOn: '2026-10-14',
      endsOn: '2026-12-14',
    }),
    /no more than 50 days/,
  )
})

test('recurring timed events preserve wall-clock time across DST', () => {
  const event: CalendarEventWithList = {
    id: 'lecture', user_id: 'user', list_id: null, title: 'Lecture', description: null,
    location: null, all_day: false, starts_at: '2026-03-02T14:00:00.000Z',
    ends_at: '2026-03-02T15:00:00.000Z', starts_on: null, ends_on: null,
    time_zone: 'America/New_York', recurrence_rule: {
      frequency: 'weekly', startDate: '2026-03-02', weekdays: [1],
    }, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', list: null,
  }
  const occurrences = expandCalendarEvents([event], [], {
    startsAt: '2026-03-01T00:00:00Z', endsAt: '2026-03-17T00:00:00Z',
    startsOn: '2026-03-01', endsOn: '2026-03-17',
  })
  assert.deepEqual(occurrences.map((item) => item.starts_at), [
    '2026-03-02T14:00:00.000Z',
    '2026-03-09T13:00:00.000Z',
    '2026-03-16T13:00:00.000Z',
  ])
  assert.equal(new Set(occurrences.map((item) => item.id)).size, 3)
})

test('weekly weekday schedules keep one series while using each day\'s wall-clock time', () => {
  const event: CalendarEventWithList = {
    id: 'lunch', user_id: 'user', list_id: null, title: 'Lunch', description: null,
    location: null, all_day: false, starts_at: '2026-03-02T17:00:00.000Z',
    ends_at: '2026-03-02T18:00:00.000Z', starts_on: null, ends_on: null,
    time_zone: 'America/New_York', recurrence_rule: {
      frequency: 'weekly', startDate: '2026-03-02', weekdays: [1, 3, 5],
      weekdayTimes: [
        { weekday: 1, startTime: '12:00', durationMinutes: 60 },
        { weekday: 3, startTime: '13:30', durationMinutes: 60 },
        { weekday: 5, startTime: '11:30', durationMinutes: 60 },
      ],
    },
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', list: null,
  }
  const occurrences = expandCalendarEvents([event], [], {
    startsAt: '2026-03-01T00:00:00Z', endsAt: '2026-03-10T00:00:00Z',
    startsOn: '2026-03-01', endsOn: '2026-03-10',
  })
  assert.deepEqual(occurrences.map((item) => [item.occurrence_key, item.starts_at, item.ends_at]), [
    ['2026-03-02|America/New_York', '2026-03-02T17:00:00.000Z', '2026-03-02T18:00:00.000Z'],
    ['2026-03-04|America/New_York', '2026-03-04T18:30:00.000Z', '2026-03-04T19:30:00.000Z'],
    ['2026-03-06|America/New_York', '2026-03-06T16:30:00.000Z', '2026-03-06T17:30:00.000Z'],
    ['2026-03-09|America/New_York', '2026-03-09T16:00:00.000Z', '2026-03-09T17:00:00.000Z'],
  ])
  assert.equal(new Set(occurrences.map((item) => item.source_event_id)).size, 1)
})

test('weekday schedules support point events, midnight crossings, and exceptions', () => {
  const event: CalendarEventWithList = {
    id: 'support', user_id: 'user', list_id: null, title: 'Support', description: null,
    location: null, all_day: false, starts_at: '2026-10-19T22:00:00.000Z',
    ends_at: null, starts_on: null, ends_on: null, time_zone: 'UTC',
    recurrence_rule: {
      frequency: 'custom', startDate: '2026-10-19', interval: 1, weekdays: [1, 3],
      weekdayTimes: [
        { weekday: 1, startTime: '23:30', durationMinutes: 120 },
        { weekday: 3, startTime: '09:00', durationMinutes: null },
      ],
    },
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', list: null,
  }
  const occurrences = expandCalendarEvents([event], [{
    id: 'moved', event_id: 'support', user_id: 'user', occurrence_key: '2026-10-21|UTC',
    cancelled: false, title: 'Support', description: null, location: null, time_zone: 'UTC',
    list_id: null, category_id: null, category: null, color: null, all_day: false,
    starts_at: '2026-10-21T10:00:00.000Z', ends_at: null, starts_on: null, ends_on: null,
    show_in_upcoming: true, created_at: '', updated_at: '',
  }], {
    startsAt: '2026-10-19T00:00:00Z', endsAt: '2026-10-27T00:00:00Z',
    startsOn: '2026-10-19', endsOn: '2026-10-27',
  })
  assert.deepEqual(occurrences.map((item) => [item.occurrence_key, item.starts_at, item.ends_at]), [
    ['2026-10-19|UTC', '2026-10-19T23:30:00.000Z', '2026-10-20T01:30:00.000Z'],
    ['2026-10-21|UTC', '2026-10-21T10:00:00.000Z', null],
    ['2026-10-26|UTC', '2026-10-26T23:30:00.000Z', '2026-10-27T01:30:00.000Z'],
  ])
})

test('recurrence exceptions cancel and move one occurrence without duplicating it', () => {
  const event: CalendarEventWithList = {
    id: 'meeting', user_id: 'user', list_id: null, title: 'Meeting', description: null,
    location: null, all_day: false, starts_at: '2026-10-19T14:00:00.000Z',
    ends_at: '2026-10-19T15:00:00.000Z', starts_on: null, ends_on: null,
    time_zone: 'UTC', recurrence_rule: { frequency: 'weekly', startDate: '2026-10-19', weekdays: [1] },
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', list: null,
  }
  const occurrences = expandCalendarEvents([event], [
    { id: 'cancel', event_id: 'meeting', user_id: 'user', occurrence_key: '2026-10-26|UTC', cancelled: true, title: null, description: null, location: null, time_zone: null, list_id: null, all_day: null, starts_at: null, ends_at: null, starts_on: null, ends_on: null, created_at: '', updated_at: '' },
    { id: 'move', event_id: 'meeting', user_id: 'user', occurrence_key: '2026-11-02|UTC', cancelled: false, title: 'Moved meeting', description: null, location: null, time_zone: 'UTC', list_id: null, all_day: false, starts_at: '2026-11-03T16:00:00.000Z', ends_at: '2026-11-03T17:00:00.000Z', starts_on: null, ends_on: null, created_at: '', updated_at: '' },
  ], {
    startsAt: '2026-10-19T00:00:00Z', endsAt: '2026-11-10T00:00:00Z',
    startsOn: '2026-10-19', endsOn: '2026-11-10',
  })
  assert.deepEqual(occurrences.map((item) => [item.occurrence_key, item.title, item.starts_at]), [
    ['2026-10-19|UTC', 'Meeting', '2026-10-19T14:00:00.000Z'],
    ['2026-11-02|UTC', 'Moved meeting', '2026-11-03T16:00:00.000Z'],
    ['2026-11-09|UTC', 'Meeting', '2026-11-09T14:00:00.000Z'],
  ])
})

test('occurrence exceptions can clear inherited optional metadata', () => {
  const event: CalendarEventWithList = {
    id: 'metadata', user_id: 'user', list_id: 'list', title: 'Meeting', description: 'Base details',
    location: 'Base room', all_day: false, starts_at: '2026-10-19T14:00:00.000Z',
    ends_at: '2026-10-19T15:00:00.000Z', starts_on: null, ends_on: null, time_zone: 'UTC',
    recurrence_rule: { frequency: 'weekly', startDate: '2026-10-19', weekdays: [1] },
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', list: null,
  }
  const occurrences = expandCalendarEvents([event], [{
    id: 'clear', event_id: 'metadata', user_id: 'user', occurrence_key: '2026-10-26|UTC',
    cancelled: false, title: 'Meeting', description: null, location: null, time_zone: 'UTC',
    list_id: null, all_day: false, starts_at: '2026-10-26T14:00:00.000Z',
    ends_at: '2026-10-26T15:00:00.000Z', starts_on: null, ends_on: null, created_at: '', updated_at: '',
  }], {
    startsAt: '2026-10-19T00:00:00Z', endsAt: '2026-11-03T00:00:00Z',
    startsOn: '2026-10-19', endsOn: '2026-11-03',
  })
  const cleared = occurrences.find((item) => item.occurrence_key === '2026-10-26|UTC')
  assert.equal(cleared?.description, null)
  assert.equal(cleared?.location, null)
  assert.equal(cleared?.list_id, null)
})
