import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_TASK_DISPLAY_MINUTES,
  durationEnd,
  isSingleDayTimedRange,
  taskDisplayEnd,
} from './calendar-interactions.ts'

test('duration-less tasks receive display height without inventing an end', () => {
  const start = new Date(2026, 9, 14, 14, 0)
  const displayEnd = taskDisplayEnd(start, null)

  assert.equal(
    displayEnd.getTime() - start.getTime(),
    DEFAULT_TASK_DISPLAY_MINUTES * 60_000,
  )
})

test('a range ending exactly at midnight remains a single-day range', () => {
  const start = new Date(2026, 9, 14, 23, 30)
  const midnight = new Date(2026, 9, 15, 0, 0)

  assert.equal(isSingleDayTimedRange(start, midnight), true)
  assert.equal(
    isSingleDayTimedRange(start, new Date(2026, 9, 15, 0, 15)),
    false,
  )
})

test('duration changes are capped at the end of the local day', () => {
  const start = new Date(2026, 9, 14, 23, 30)
  const end = durationEnd(start, 120)

  assert.equal(end?.getDate(), 15)
  assert.equal(end?.getHours(), 0)
  assert.equal(end?.getMinutes(), 0)
})
