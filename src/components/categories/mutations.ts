'use client'

import type { CategoryVisualMutation } from '@/lib/live-mutations'

export const CATEGORIES_CHANGED = 'planomy:categories-changed'

export function notifyCategoriesChanged(change?: CategoryVisualMutation) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<CategoryVisualMutation | undefined>(CATEGORIES_CHANGED, {
    detail: change,
  }))
}

export function categoryVisualMutationFromEvent(event: Event): CategoryVisualMutation | null {
  if (!(event instanceof CustomEvent)) return null
  const change = event.detail as CategoryVisualMutation | undefined
  return change && typeof change.categoryId === 'string' && typeof change.listId === 'string'
    ? change
    : null
}
