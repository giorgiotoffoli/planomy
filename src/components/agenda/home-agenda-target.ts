let homeAgendaTarget: HTMLDivElement | null = null
const listeners = new Set<() => void>()

export function setHomeAgendaTarget(target: HTMLDivElement | null) {
  if (homeAgendaTarget === target) return

  homeAgendaTarget = target
  listeners.forEach((listener) => listener())
}

export function subscribeToHomeAgendaTarget(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getHomeAgendaTarget() {
  return homeAgendaTarget
}
