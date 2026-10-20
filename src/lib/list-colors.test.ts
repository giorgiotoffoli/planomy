import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isListColor,
  listColorCssValue,
  normalizeItemColor,
  PLANOMY_LIST_COLORS,
  resolveEventColor,
  resolveInheritedColor,
  resolveItemColor,
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

test('item colors inherit from Lists until an override is chosen', () => {
  assert.equal(normalizeItemColor(undefined), null)
  assert.equal(normalizeItemColor('teal'), 'teal')
  assert.equal(resolveItemColor(null, 'orange'), 'orange')
  assert.equal(resolveItemColor('pink', 'orange'), 'pink')
  assert.throws(() => normalizeItemColor('neon-chartreuse'), /approved palette/)
})

test('category colors inherit from Lists without item-level overrides', () => {
  assert.equal(resolveInheritedColor('pink', 'orange'), 'pink')
  assert.equal(resolveInheritedColor(null, 'orange'), 'orange')
  assert.equal(resolveInheritedColor(undefined, null), null)
})

test('event colors override category and list colors', () => {
  assert.equal(resolveEventColor('pink', 'green', 'blue'), 'pink')
  assert.equal(resolveEventColor(null, 'green', 'blue'), 'green')
  assert.equal(resolveEventColor(undefined, null, 'blue'), 'blue')
})
