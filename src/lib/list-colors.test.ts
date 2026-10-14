import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isListColor,
  listColorCssValue,
  PLANOMY_LIST_COLORS,
} from './list-colors.ts'

test('approved List colors are unique, stable tokens', () => {
  const ids = PLANOMY_LIST_COLORS.map(({ id }) => id)
  assert.equal(new Set(ids).size, 10)
  assert.equal(isListColor('blue'), true)
  assert.equal(isListColor('neon-chartreuse'), false)
})

test('List colors resolve through theme-aware CSS variables', () => {
  assert.equal(listColorCssValue('violet'), 'var(--list-color-violet)')
  assert.equal(listColorCssValue(null), 'var(--list-color-neutral)')
})
