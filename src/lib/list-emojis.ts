export const DEFAULT_LIST_EMOJI = '📁'
export const MAX_LIST_EMOJI_CODE_POINTS = 16

export const LIST_EMOJI_OPTIONS = [
  '📁', '📚', '🎓', '💻', '💼', '🏠', '🛒',
  '🎥', '🎵', '🎨', '✈️', '💪', '🏃', '🎮',
  '💡', '🚀', '🧠', '❤️', '⭐', '🔧', '📝',
  '💰', '📅', '🌱', '🍳', '🐶', '🚗', '🎯',
] as const

/**
 * Keep the input bounded without assuming an emoji is one JavaScript character.
 * Array.from counts Unicode code points and preserves ZWJ/variation sequences.
 */
export function normalizeListEmoji(value: string | null | undefined) {
  const normalized = value?.trim() ?? ''
  if (!normalized) return null

  return Array.from(normalized)
    .slice(0, MAX_LIST_EMOJI_CODE_POINTS)
    .join('')
}
