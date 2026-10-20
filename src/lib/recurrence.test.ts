import assert from 'node:assert/strict'
import test from 'node:test'
import {
  generateOccurrenceDateKeys,
  isMissedSession,
  normalizeRecurrenceRule,
  recurrenceLabel,
  recurrenceMatchesDate,
  recurringSessionTimes,
  zonedDateTimeToInstant,
} from './recurrence.ts'

test('daily and weekday recurrence rules generate stable local dates', () => {
  assert.deepEqual(
    generateOccurrenceDateKeys(
      { frequency: 'daily', startDate: '2026-10-19', interval: 1 },
      '2026-10-19',
      '2026-10-24',
    ),
    ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'],
  )
  assert.deepEqual(
    generateOccurrenceDateKeys(
      { frequency: 'weekday', startDate: '2026-10-19' },
      '2026-10-19',
      '2026-10-26',
    ),
    ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'],
  )
})

test('weekly recurrence honors weekdays and an inclusive end condition', () => {
  const rule = {
    frequency: 'weekly' as const,
    startDate: '2026-10-05',
    weekdays: [1, 3],
    endDate: '2026-10-14',
  }
  assert.equal(recurrenceMatchesDate(rule, '2026-10-12'), true)
  assert.deepEqual(generateOccurrenceDateKeys(rule, '2026-10-05', '2026-10-20'), [
    '2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14',
  ])
})

test('weekday times normalize into stable weekday order and replace duplicate days', () => {
  assert.deepEqual(normalizeRecurrenceRule({
    frequency: 'weekly',
    startDate: '2026-10-05',
    weekdays: [5, 1],
    weekdayTimes: [
      { weekday: 5, startTime: '11:30', durationMinutes: 60 },
      { weekday: 1, startTime: '12:00', durationMinutes: 60 },
      { weekday: 5, startTime: '12:30', durationMinutes: null },
    ],
  }), {
    frequency: 'weekly',
    startDate: '2026-10-05',
    interval: 1,
    weekdays: [1, 5],
    endDate: null,
    count: null,
    weekdayTimes: [
      { weekday: 1, startTime: '12:00', durationMinutes: 60 },
      { weekday: 5, startTime: '12:30', durationMinutes: null },
    ],
  })
})

test('custom recurrence can repeat on selected weekdays', () => {
  const rule = {
    frequency: 'custom' as const,
    startDate: '2026-10-05',
    interval: 2,
    weekdays: [1, 3],
  }
  assert.deepEqual(generateOccurrenceDateKeys(rule, '2026-10-05', '2026-10-21'), [
    '2026-10-05', '2026-10-07', '2026-10-19',
  ])
  assert.equal(recurrenceMatchesDate(rule, '2026-10-21'), true)
  assert.equal(recurrenceLabel(rule), 'Every 2 weeks on Monday, Wednesday')
})

test('occurrence counts remain stable when a later window is requested', () => {
  assert.deepEqual(
    generateOccurrenceDateKeys(
      { frequency: 'daily', startDate: '2026-10-01', count: 2 },
      '2026-10-02',
      '2026-10-10',
    ),
    ['2026-10-02'],
  )
})

test('missed sessions are distinct from skipped and completed work', () => {
  const session = {
    starts_at: '2026-10-19T09:00:00-05:00',
    ends_at: '2026-10-19T10:00:00-05:00',
    status: 'scheduled' as const,
  }
  const now = new Date('2026-10-19T10:01:00-05:00')
  assert.equal(isMissedSession(session, false, now), true)
  assert.equal(isMissedSession({ ...session, status: 'skipped' }, false, now), false)
  assert.equal(isMissedSession(session, true, now), false)
  assert.equal(recurrenceLabel({ frequency: 'monthly', startDate: '2026-10-01' }), 'Every month')
})

test('recurring session times preserve local wall-clock time across DST', () => {
  const zone = 'America/New_York'
  assert.equal(zonedDateTimeToInstant('2026-03-07', '10:00', zone), '2026-03-07T15:00:00.000Z')
  assert.equal(zonedDateTimeToInstant('2026-03-10', '10:00', zone), '2026-03-10T14:00:00.000Z')

  const sessions = recurringSessionTimes({
    frequency: 'weekly',
    startDate: '2026-03-02',
    weekdays: [2],
    scheduledSessions: [
      { id: 'morning', startTime: '10:00', durationMinutes: 30, timeZone: zone },
      { id: 'evening', startTime: '17:00', durationMinutes: null, timeZone: zone },
    ],
  }, '2026-03-10')
  assert.deepEqual(sessions.map((session) => [session.session.id, session.startsAt, session.endsAt]), [
    ['morning', '2026-03-10T14:00:00.000Z', '2026-03-10T14:30:00.000Z'],
    ['evening', '2026-03-10T21:00:00.000Z', null],
  ])
})
