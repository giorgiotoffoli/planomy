import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryBelongsToList, normalizeDeadline, resolveLocalPlanTime } from './task-form.ts'

test('deadline normalization keeps date-only deadlines local-safe', () => {
  assert.deepEqual(normalizeDeadline('2026-10-12', null), {
    dueDate: '2026-10-12',
    dueTime: null,
  })
  assert.deepEqual(normalizeDeadline(null, '23:59'), {
    dueDate: null,
    dueTime: null,
  })
})

test('deadline normalization stores a time only with a valid date', () => {
  assert.deepEqual(normalizeDeadline('2026-10-12', '23:59'), {
    dueDate: '2026-10-12',
    dueTime: '23:59',
  })
  assert.throws(() => normalizeDeadline('2026-02-30', null), /valid deadline date/)
  assert.throws(() => normalizeDeadline('2026-10-12', '25:00'), /valid deadline time/)
})

test('categories are scoped to the selected list', () => {
  const categories = [
    { id: 'school-homework', list_id: 'school', title: 'Homework', position: 0 },
    { id: 'planomy-dev', list_id: 'planomy', title: 'Development', position: 0 },
  ]
  assert.equal(categoryBelongsToList(categories, 'school', 'school-homework'), true)
  assert.equal(categoryBelongsToList(categories, 'planomy', 'school-homework'), false)
  assert.equal(categoryBelongsToList(categories, null, 'school-homework'), false)
  assert.equal(categoryBelongsToList(categories, null, null), true)
})

test('local Plan time becomes an explicit instant after validation', () => {
  const result = resolveLocalPlanTime('2026-10-12', '15:00', 60)
  assert.equal(result.endsAt, new Date(Date.parse(result.startsAt) + 60 * 60_000).toISOString())
})

test('local Plan time does not invent a duration when none is provided', () => {
  const result = resolveLocalPlanTime('2026-10-12', '15:00', null)
  assert.equal(result.endsAt, null)
})
