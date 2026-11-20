import assert from 'node:assert/strict'
import test from 'node:test'
import { dayBounds, dragIntent, MINUTE, snapInstant } from './agenda.ts'

test('Agenda drop snapping can use the Calendar five-minute interval', () => {
  const day = '2026-11-18'
  const snapped = snapInstant(day, 11, 5)

  assert.equal((snapped - dayBounds(day).start) / MINUTE, 10)
})

test('Agenda keeps its existing fifteen-minute default snap interval', () => {
  const day = '2026-11-18'
  const snapped = snapInstant(day, 11)

  assert.equal((snapped - dayBounds(day).start) / MINUTE, 15)
})

test('task drops over a category target are categorized', () => {
  assert.equal(
    dragIntent(
      { kind: 'task', scope: 'list-1', categoryId: 'backlog' },
      { kind: 'task-category', scope: 'list-1', categoryId: 'doing' },
    ),
    'categorize',
  )
})

test('task drops over a task in another category are categorized', () => {
  assert.equal(
    dragIntent(
      { kind: 'task', scope: 'list-1', categoryId: null },
      { kind: 'task', scope: 'list-1', categoryId: 'doing' },
    ),
    'categorize',
  )
})

test('task drops over a task in the same category still reorder', () => {
  assert.equal(
    dragIntent(
      { kind: 'task', scope: 'list-1', categoryId: 'doing' },
      { kind: 'task', scope: 'list-1', categoryId: 'doing' },
    ),
    'reorder',
  )
})

test('task category drops stay within the originating list scope', () => {
  assert.equal(
    dragIntent(
      { kind: 'task', scope: 'list-1', categoryId: null },
      { kind: 'task-category', scope: 'list-2', categoryId: 'doing' },
    ),
    'none',
  )
})
