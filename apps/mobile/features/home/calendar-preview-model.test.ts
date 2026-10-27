import assert from 'node:assert/strict'
import test from 'node:test'
import { getCalendarPreviewDays } from './calendar-preview-model.ts'

test('calendar preview counts task deadlines and events on seven local dates', () => {
  const days = getCalendarPreviewDays('2026-10-22', [
    { kind: 'task', sortKey: '2026-10-21T12:00' },
    { kind: 'task', sortKey: '2026-10-22T09:00' },
    { kind: 'task', sortKey: '2026-10-24T12:00' },
    { kind: 'event', sortKey: '2026-10-24T14:00' },
    { kind: 'event', sortKey: '2026-10-29T09:00' },
  ])

  assert.equal(days.length, 7)
  assert.deepEqual(days[0], {
    date: '2026-10-22',
    taskCount: 1,
    eventCount: 0,
  })
  assert.deepEqual(days[2], {
    date: '2026-10-24',
    taskCount: 1,
    eventCount: 1,
  })
  assert.equal(days[6]?.date, '2026-10-28')
  assert.equal(days[6]?.eventCount, 0)
})
