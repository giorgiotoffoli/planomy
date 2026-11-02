import assert from 'node:assert/strict'
import test from 'node:test'
import { previewSnapshot } from './model.ts'
import { getListEvents } from './list-events.ts'

test('list events include distant and hidden series without mixing lists or occurrences', () => {
  const original = previewSnapshot('2026-10-22').events[0]!
  const events = [
    original,
    { ...original, id: 'later', starts_on: '2028-02-01', show_in_list: false },
    { ...original, id: 'unsorted', list_id: null },
    { ...original, id: 'other', list_id: 'work' },
  ]
  assert.deepEqual(getListEvents(events, 'personal').map((event) => event.id), ['event', 'later'])
  assert.deepEqual(getListEvents(events, null).map((event) => event.id), ['unsorted'])
  assert.deepEqual(getListEvents(events, 'missing'), [])
})
