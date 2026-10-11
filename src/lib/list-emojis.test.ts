import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_LIST_EMOJI_CODE_POINTS,
  normalizeListEmoji,
} from './list-emojis.ts'

test('normalizes empty list emojis to null', () => {
  assert.equal(normalizeListEmoji('   '), null)
  assert.equal(normalizeListEmoji(null), null)
})

test('preserves multi-code-point emoji sequences', () => {
  assert.equal(normalizeListEmoji('👩‍💻'), '👩‍💻')
  assert.equal(normalizeListEmoji('❤️'), '❤️')
})

test('bounds custom emoji input by code points', () => {
  const value = '😀'.repeat(MAX_LIST_EMOJI_CODE_POINTS + 4)
  assert.equal(
    Array.from(normalizeListEmoji(value) ?? []).length,
    MAX_LIST_EMOJI_CODE_POINTS,
  )
})
