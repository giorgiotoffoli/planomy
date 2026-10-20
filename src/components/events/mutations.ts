import type { EventVisualMutation } from '@/lib/live-mutations'

export const EVENTS_CHANGED = 'planomy:events-changed'

export function notifyEventsChanged(change?: EventVisualMutation) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<EventVisualMutation | undefined>(EVENTS_CHANGED, {
      detail: change,
    }))
  }
}

export function eventVisualMutationFromEvent(
  event: Event,
): EventVisualMutation | null {
  if (!(event instanceof CustomEvent)) return null
  const change = event.detail as EventVisualMutation | undefined
  return change && typeof change.eventId === 'string' ? change : null
}
