import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_TASK_DISPLAY_MINUTES,
  durationEnd,
  isSingleDayTimedRange,
  moveTimedRange,
  snapCreationStart,
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

test('new calendar selections start on a 15-minute boundary', () => {
  const start = new Date(2026, 9, 14, 9, 5)
  const snapped = snapCreationStart(start)

  assert.equal(snapped.getHours(), 9)
  assert.equal(snapped.getMinutes(), 0)
  assert.equal(snapped.getSeconds(), 0)
})

test('creation snapping does not change the original Date', () => {
  const start = new Date(2026, 9, 14, 9, 17)
  const snapped = snapCreationStart(start)

  assert.equal(start.getMinutes(), 17)
  assert.equal(snapped.getMinutes(), 15)
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

test('moving a draft keeps its exact time window', () => {
  const start = new Date(2026, 9, 14, 10, 30)
  const end = new Date(2026, 9, 14, 11, 15)
  const nextStart = new Date(2026, 9, 14, 14, 0)
  const moved = moveTimedRange(start, end, nextStart)

  assert.equal(moved.startsAt.getTime(), nextStart.getTime())
  assert.equal(moved.endsAt?.getHours(), 14)
  assert.equal(moved.endsAt?.getMinutes(), 45)
  assert.equal(
    moved.endsAt!.getTime() - moved.startsAt.getTime(),
    end.getTime() - start.getTime(),
  )
})

test('moving a duration-less draft keeps its default display window', () => {
  const start = new Date(2026, 9, 14, 10, 30)
  const nextStart = new Date(2026, 9, 14, 12, 0)
  const moved = moveTimedRange(start, null, nextStart)

  assert.equal(
    moved.endsAt!.getTime() - moved.startsAt.getTime(),
    DEFAULT_TASK_DISPLAY_MINUTES * 60_000,
  )
})
