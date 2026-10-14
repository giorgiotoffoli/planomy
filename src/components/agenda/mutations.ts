'use client'

export const PLAN_TIME_CHANGED = 'planomy:plan-time-changed'

export type PlanTimeChangeOrigin = 'agenda' | 'calendar'

export function notifyPlanTimeChanged(origin: PlanTimeChangeOrigin) {
  window.dispatchEvent(new CustomEvent(PLAN_TIME_CHANGED, { detail: { origin } }))
}

export function planTimeChangeOrigin(event: Event) {
  return event instanceof CustomEvent
    ? (event.detail?.origin as PlanTimeChangeOrigin | undefined)
    : undefined
}
