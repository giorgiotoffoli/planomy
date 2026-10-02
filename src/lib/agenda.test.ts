import test from 'node:test'
import assert from 'node:assert/strict'
import { dayBounds, dragIntent, layoutBlocks, localTimeCandidates, MINUTE, shiftDay, snapInstant, validateInterval } from './agenda.ts'

process.env.TZ = 'America/Chicago'

test('local days include DST transitions and calendar navigation', () => {
  assert.equal(dayBounds('2026-03-08').minutes, 23 * 60)
  assert.equal(dayBounds('2026-11-01').minutes, 25 * 60)
  assert.equal(dayBounds('2026-10-01').minutes, 24 * 60)
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
})

test('missing local times are rejected and repeated times have two explicit instants', () => {
  assert.deepEqual(localTimeCandidates('2026-03-08', '02:30'), [])
  const repeated = localTimeCandidates('2026-11-01', '01:30')
  assert.equal(repeated.length, 2)
  assert.equal(repeated[1] - repeated[0], 60 * MINUTE)
  assert.equal(new Date(repeated[0]).toISOString(), '2026-11-01T06:30:00.000Z')
  assert.equal(new Date(repeated[1]).toISOString(), '2026-11-01T07:30:00.000Z')
  assert.deepEqual(localTimeCandidates('2026-10-01', '24:00'), [])
})

test('15-minute snapping clamps to the actual day, including both fall-back hours', () => {
  const { start, end } = dayBounds('2026-11-01')
  assert.equal(snapInstant('2026-11-01', -20), start)
  assert.equal(snapInstant('2026-11-01', 38), start + 45 * MINUTE)
  assert.equal(snapInstant('2026-11-01', 2000), end - 15 * MINUTE)
  assert.notEqual(snapInstant('2026-11-01', 90), snapInstant('2026-11-01', 150))
})

test('validation requires explicit offsets, finite instants and minimum elapsed duration', () => {
  assert.throws(() => validateInterval('2026-10-01T12:00:00', '2026-10-01T13:00:00'))
  assert.throws(() => validateInterval('invalid', 'invalid'))
  assert.throws(() => validateInterval('2026-10-01T12:00:00Z', '2026-10-01T12:14:59Z'))
  assert.throws(() => validateInterval('2026-10-01T12:00:00Z', '2026-10-01T11:00:00Z'))
  assert.doesNotThrow(() => validateInterval('2026-11-01T01:45:00-05:00', '2026-11-01T01:00:00-06:00'))
})

test('midnight crossings are clipped without changing the persisted interval', () => {
  const original = { task_id: 'a', starts_at: '2026-10-01T23:45:00-05:00', ends_at: '2026-10-02T01:00:00-05:00' }
  const [first] = layoutBlocks([original], '2026-10-01')
  const [second] = layoutBlocks([original], '2026-10-02')
  assert.equal((first.end - first.start) / MINUTE, 15)
  assert.equal((second.end - second.start) / MINUTE, 60)
  assert.equal(first.block, original)
  assert.equal(second.block, original)
  assert.equal(layoutBlocks([original], '2026-10-03').length, 0)
})

test('overlaps use separate columns; touching blocks can reuse columns', () => {
  const block = (id: string, start: string, end: string) => ({ task_id: id, starts_at: `2026-10-01T${start}:00-05:00`, ends_at: `2026-10-01T${end}:00-05:00` })
  const layout = layoutBlocks([block('a', '09:00', '11:00'), block('b', '09:30', '10:00'), block('c', '10:00', '10:30'), block('d', '11:00', '12:00')], '2026-10-01')
  assert.deepEqual(layout.map(({ column, columns }) => [column, columns]), [[0, 2], [1, 2], [1, 2], [0, 1]])
})

test('scheduling is available without reordering and never routes to board or other-list targets', () => {
  assert.equal(dragIntent({ kind: 'task' }, { kind: 'agenda-slot' }), 'schedule')
  assert.equal(dragIntent({ kind: 'agenda-block' }, { kind: 'agenda-slot' }), 'schedule')
  assert.equal(dragIntent({ kind: 'agenda-resize' }, { kind: 'agenda-slot' }), 'schedule')
  assert.equal(dragIntent({ kind: 'task', scope: 'list-a' }, { kind: 'task', scope: 'list-a' }), 'reorder')
  assert.equal(dragIntent({ kind: 'task' }, { kind: 'task' }), 'none')
  assert.equal(dragIntent({ kind: 'task', scope: 'list-a' }, { kind: 'task', scope: 'list-b' }), 'none')
  assert.equal(dragIntent({ kind: 'board' }, { kind: 'agenda-slot' }), 'none')
  assert.equal(dragIntent({ kind: 'task' }, undefined), 'none')
})
