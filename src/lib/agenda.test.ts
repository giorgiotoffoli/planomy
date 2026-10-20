import assert from 'node:assert/strict'
import test from 'node:test'
import { dragIntent } from './agenda.ts'

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
