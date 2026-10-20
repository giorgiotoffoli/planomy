export type TaskOccurrenceContext = {
  occurrenceId: string
  occurrenceDate: string
  sessionId?: string
  sessionIndex?: number | null
  startsAt?: string
  endsAt?: string | null
}
