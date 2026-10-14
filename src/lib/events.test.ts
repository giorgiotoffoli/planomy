import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeEventFields, validateCalendarRange } from './events.ts'

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
      list_id: 'school',
      all_day: false,
      starts_at: '2026-10-14T14:00:00-05:00',
      ends_at: '2026-10-14T15:00:00-05:00',
      starts_on: null,
      ends_on: null,
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
