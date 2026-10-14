'use client'

import { useEffect, useMemo, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { listColorCssValue } from '@/lib/list-colors'
import type { CalendarItem } from '@/lib/calendar-items'
import type { CalendarRangeInput } from '@/lib/events'
import { localDateKey } from '@/lib/today'
import CalendarItemContent from './calendar-item-content'
import type {
  CalendarNavigation,
  CalendarViewMode,
} from './calendar-header'

type CalendarCommand = {
  id: number
  navigation: CalendarNavigation
}

const calendarPlugins = [dayGridPlugin, timeGridPlugin, interactionPlugin]
const fullCalendarView: Record<CalendarViewMode, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
}

function formatWeekRange(start: Date, exclusiveEnd: Date) {
  const end = new Date(exclusiveEnd)
  end.setDate(end.getDate() - 1)

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()

  if (sameMonth) {
    const month = start.toLocaleDateString(undefined, { month: 'long' })
    return `${month} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
  }

  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

function formatRangeLabel(
  mode: CalendarViewMode,
  start: Date,
  end: Date,
  currentStart: Date,
) {
  if (mode === 'day') {
    return start.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (mode === 'month') {
    return currentStart.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
  }

  return formatWeekRange(start, end)
}

export default function CalendarView({
  viewMode,
  command,
  calendarItems,
  onRangeLabelChange,
  onRangeChange,
  onTaskOpen,
}: {
  viewMode: CalendarViewMode
  command: CalendarCommand | null
  calendarItems: CalendarItem[]
  onRangeLabelChange: (label: string) => void
  onRangeChange: (range: CalendarRangeInput) => void
  onTaskOpen: (taskId: string) => void
}) {
  const calendarRef = useRef<FullCalendar>(null)
  const itemById = useMemo(
    () => new Map(calendarItems.map((item) => [item.id, item])),
    [calendarItems],
  )
  const fullCalendarEvents = useMemo(
    () =>
      calendarItems.map((item) => {
        if (item.kind === 'due-task') {
          return {
            id: item.id,
            title: item.task.title,
            start: item.dateKey,
            allDay: true,
            extendedProps: { kind: item.kind, order: item.task.due_time },
          }
        }
        if (item.kind === 'scheduled-task') {
          return {
            id: item.id,
            title: item.task.title,
            start: item.startsAt,
            end: item.endsAt ?? undefined,
            allDay: false,
            extendedProps: { kind: item.kind },
          }
        }
        return {
          id: item.id,
          title: item.event.title,
          start: item.event.all_day
            ? item.event.starts_on ?? undefined
            : item.event.starts_at ?? undefined,
          end: item.event.all_day
            ? item.event.ends_on ?? undefined
            : item.event.ends_at ?? undefined,
          allDay: item.event.all_day,
          extendedProps: { kind: item.kind },
        }
      }),
    [calendarItems],
  )

  useEffect(() => {
    if (!command) return

    const api = calendarRef.current?.getApi()
    if (!api) return

    if (command.navigation === 'previous') api.prev()
    if (command.navigation === 'next') api.next()
    if (command.navigation === 'today') api.today()
  }, [command])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (api && api.view.type !== fullCalendarView[viewMode]) {
      api.changeView(fullCalendarView[viewMode])
    }
  }, [viewMode])

  return (
    <div className="calendar-grid-scroll min-h-0 flex-1 overflow-x-auto">
      <div
        className={`planomy-calendar h-full ${viewMode === 'day' ? 'min-w-[520px]' : 'min-w-[760px]'}`}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={calendarPlugins}
          initialView={fullCalendarView.week}
          firstDay={0}
          headerToolbar={false}
          height="100%"
          nowIndicator
          allDaySlot
          allDayContent={() => <span className="planomy-due-label">All day</span>}
          dayHeaderContent={(info) =>
            info.view.type === 'dayGridMonth' ? (
              <div className="planomy-calendar-day-heading is-month">
                <span className="planomy-calendar-weekday">
                  {info.date.toLocaleDateString(undefined, {
                    weekday: 'short',
                  })}
                </span>
              </div>
            ) : (
              <div className="planomy-calendar-day-heading">
                <span className="planomy-calendar-weekday">
                  {info.date.toLocaleDateString(undefined, {
                    weekday: 'short',
                  })}
                </span>
                <span
                  className={`planomy-calendar-day-number ${info.isToday ? 'is-today' : ''}`}
                >
                  {info.date.getDate()}
                </span>
              </div>
            )
          }
          dayCellContent={(info) =>
            info.view.type === 'dayGridMonth' ? (
              <span
                className={`planomy-month-day-number ${info.isToday ? 'is-today' : ''}`}
              >
                {info.date.getDate()}
              </span>
            ) : null
          }
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:30:00"
          scrollTimeReset={false}
          slotDuration="00:30:00"
          defaultTimedEventDuration="00:30:00"
          forceEventDuration={false}
          slotLabelInterval="01:00:00"
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'short',
          }}
          expandRows={false}
          weekends
          editable={false}
          selectable={false}
          displayEventTime={false}
          eventDisplay="block"
          events={fullCalendarEvents}
          eventOrder="order,title"
          eventOrderStrict
          dayMaxEvents={3}
          fixedWeekCount={false}
          showNonCurrentDates
          moreLinkClick="popover"
          moreLinkContent={(info) => `+${info.num}`}
          datesSet={(info) => {
            onRangeLabelChange(
              formatRangeLabel(
                viewMode,
                info.start,
                info.end,
                info.view.currentStart,
              ),
            )
            onRangeChange({
              startsAt: info.start.toISOString(),
              endsAt: info.end.toISOString(),
              startsOn: localDateKey(info.start),
              endsOn: localDateKey(info.end),
            })
          }}
          eventClassNames={(info) => {
            const item = itemById.get(info.event.id)
            return [
              item?.kind === 'due-task'
                ? 'planomy-due-event'
                : item?.kind === 'scheduled-task'
                  ? 'planomy-scheduled-event'
                  : 'planomy-native-event',
              info.view.type === 'dayGridMonth' ? 'is-month' : 'is-time-grid',
            ]
          }}
          eventContent={(info) => {
            const item = itemById.get(info.event.id)
            return item ? (
              <CalendarItemContent
                item={item}
                compact={info.view.type === 'dayGridMonth'}
              />
            ) : null
          }}
          eventDidMount={(info) => {
            const item = itemById.get(info.event.id)
            if (!item) return
            const color = item.kind === 'event'
              ? item.event.list?.color
              : item.task.list?.color
            info.el.style.setProperty('--list-color', listColorCssValue(color))
            if (item.kind === 'due-task') {
              const dueTime = item.dueTimeLabel ? ` at ${item.dueTimeLabel}` : ''
              info.el.setAttribute(
                'aria-label',
                `${item.task.title}, due ${item.dateKey}${dueTime}`,
              )
            }
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault()
            const item = itemById.get(info.event.id)
            if (item?.kind === 'due-task' || item?.kind === 'scheduled-task') {
              onTaskOpen(item.task.id)
            }
          }}
        />
      </div>
    </div>
  )
}
