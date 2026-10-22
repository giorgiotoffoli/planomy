import { addCalendarDays } from '../../../../src/lib/today.ts'
import type { UpcomingEntry } from '@planomy/lib/home-upcoming'
import type { CalendarPreviewDay } from '@/components/calendar'

export function getCalendarPreviewDays(
  today: string,
  entries: readonly Pick<UpcomingEntry, 'kind' | 'sortKey'>[],
): CalendarPreviewDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addCalendarDays(today, index)
    const matching = entries.filter((entry) => entry.sortKey.slice(0, 10) === date)
    return {
      date,
      taskCount: matching.filter((entry) => entry.kind === 'task').length,
      eventCount: matching.filter((entry) => entry.kind === 'event').length,
    }
  })
}
