import assert from 'node:assert/strict'
import test from 'node:test'
import { isDateKey, localDateKey, MAX_DAILY_FOCUS, previousDateKey } from './my-day.ts'

test('date keys use the device calendar date instead of a UTC truncation', () => {
  const nearMidnight = new Date(2026, 2, 8, 23, 59)
  assert.equal(localDateKey(nearMidnight), '2026-03-08')
})

test('previous date arithmetic crosses month, year, and DST boundaries', () => {
  assert.equal(previousDateKey('2026-03-09'), '2026-03-08')
  assert.equal(previousDateKey('2026-11-02'), '2026-11-01')
  assert.equal(previousDateKey('2026-01-01'), '2025-12-31')
})

test('calendar date validation rejects normalized and malformed dates', () => {
  assert.equal(isDateKey('2026-02-28'), true)
  assert.equal(isDateKey('2026-02-30'), false)
  assert.equal(isDateKey('02/28/2026'), false)
})

test('daily focus limit remains three', () => {
  assert.equal(MAX_DAILY_FOCUS, 3)
})
