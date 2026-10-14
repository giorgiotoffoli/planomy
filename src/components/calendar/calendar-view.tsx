'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { isListColor, listColorCssValue } from '@/lib/list-colors'
import type { CalendarItem } from '@/lib/calendar-items'
import type { CalendarRangeInput } from '@/lib/events'
import { durationEnd, isSingleDayTimedRange, taskDisplayEnd } from '@/lib/calendar-interactions'
import { localDateKey } from '@/lib/today'
import type { List, TaskWithList } from '@/types'
import CalendarItemContent from './calendar-item-content'
import CalendarQuickCreate, {
  type QuickCreateDraft,
  type QuickCreateInput,
} from './calendar-quick-create'
import type {
  CalendarNavigation,
  CalendarViewMode,
} from './calendar-header'

type CalendarCommand = {
  id: number
  navigation: CalendarNavigation
}

type CalendarEventInput = {
  id: string
  title: string
  start?: string
  end?: string
  allDay: boolean
  editable: boolean
  startEditable?: boolean
  durationEditable?: boolean
  extendedProps: Record<string, unknown>
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

function anchorFromEvent(event: MouseEvent | null, fallback: HTMLElement | null) {
  if (event) return { x: event.clientX, y: event.clientY }
  const rect = fallback?.getBoundingClientRect()
  return {
    x: rect ? rect.left + Math.min(rect.width / 2, 240) : window.innerWidth / 2,
    y: rect ? rect.top + Math.min(rect.height / 2, 240) : window.innerHeight / 2,
  }
}

function calendarMinimumWidth(viewMode: CalendarViewMode) {
  if (viewMode === 'day') return 'min-w-[320px]'
  if (viewMode === 'week') return 'min-w-[840px]'
  return 'min-w-[720px]'
}

export default function CalendarView({
  viewMode,
  command,
  calendarItems,
  lists,
  selectedTaskId,
  busyTaskIds,
  onRangeLabelChange,
  onRangeChange,
  onTaskSelect,
  onTaskOpen,
  onTaskSchedule,
  onTaskUnschedule,
  onTaskComplete,
  onQuickCreate,
}: {
  viewMode: CalendarViewMode
  command: CalendarCommand | null
  calendarItems: CalendarItem[]
  lists: List[]
  selectedTaskId: string | null
  busyTaskIds: Set<string>
  onRangeLabelChange: (label: string) => void
  onRangeChange: (range: CalendarRangeInput) => void
  onTaskSelect: (taskId: string | null) => void
  onTaskOpen: (taskId: string) => void
  onTaskSchedule: (task: TaskWithList, startsAt: Date, endsAt: Date | null) => Promise<boolean>
  onTaskUnschedule: (task: TaskWithList) => Promise<boolean>
  onTaskComplete: (task: TaskWithList) => Promise<boolean>
  onQuickCreate: (input: QuickCreateInput) => Promise<boolean>
}) {
  const calendarRef = useRef<FullCalendar>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<QuickCreateDraft | null>(null)
  const itemById = useMemo(
    () => new Map(calendarItems.map((item) => [item.id, item])),
    [calendarItems],
  )
  const interactiveTimeGrid = viewMode === 'day' || viewMode === 'week'
  const clearInteraction = useCallback(() => {
    setDraft(null)
    calendarRef.current?.getApi().unselect()
  }, [])
  const changeDraftTitle = useCallback((title: string) => {
    setDraft((current) =>
      current && current.title !== title ? { ...current, title } : current,
    )
  }, [])
  const changeDraftList = useCallback((listId: string | null) => {
    setDraft((current) =>
      current && current.listId !== listId ? { ...current, listId } : current,
    )
  }, [])
  const changeDraftRange = useCallback((startsAt: Date, endsAt: Date | null) => {
    setDraft((current) => {
      if (!current) return null
      const sameStart = current.startsAt.getTime() === startsAt.getTime()
      const sameEnd = current.endsAt?.getTime() === endsAt?.getTime()
      return sameStart && sameEnd ? current : { ...current, startsAt, endsAt }
    })
  }, [])

  const fullCalendarEvents = useMemo(() => {
    const events: CalendarEventInput[] = calendarItems.map((item) => {
      if (item.kind === 'due-task') {
        return {
          id: item.id,
          title: item.task.title,
          start: item.dateKey,
          allDay: true,
          editable: false,
          extendedProps: { kind: item.kind, order: item.task.due_time },
        }
      }
      if (item.kind === 'scheduled-task') {
        const interactive = interactiveTimeGrid && !busyTaskIds.has(item.task.id)
        return {
          id: item.id,
          title: item.task.title,
          start: item.startsAt,
          end: item.endsAt ?? undefined,
          allDay: false,
          editable: interactive,
          startEditable: interactive,
          durationEditable: interactive,
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
        editable: false,
        extendedProps: { kind: item.kind },
      }
    })

    if (draft) {
      const selectedList = lists.find((list) => list.id === draft.listId)
      events.push({
        id: `calendar:create-draft:${draft.listId ?? 'none'}`,
        title: draft.title || 'New task',
        start: draft.startsAt.toISOString(),
        end: taskDisplayEnd(draft.startsAt, draft.endsAt).toISOString(),
        allDay: false,
        editable: false,
        extendedProps: {
          kind: 'create-draft',
          listColor: selectedList?.color ?? null,
          persistedEnd: draft.endsAt?.toISOString() ?? null,
        },
      })
    }
    return events
  }, [busyTaskIds, calendarItems, draft, interactiveTimeGrid, lists])

  useEffect(() => {
    if (!command) return
    const api = calendarRef.current?.getApi()
    if (!api) return

    clearInteraction()
    onTaskSelect(null)
    if (command.navigation === 'previous') api.prev()
    if (command.navigation === 'next') api.next()
    if (command.navigation === 'today') api.today()
  }, [clearInteraction, command, onTaskSelect])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (api && api.view.type !== fullCalendarView[viewMode]) {
      clearInteraction()
      onTaskSelect(null)
      api.changeView(fullCalendarView[viewMode])
    }
  }, [clearInteraction, onTaskSelect, viewMode])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      clearInteraction()
      onTaskSelect(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [clearInteraction, onTaskSelect])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const scheduledEvent = target.closest('.planomy-scheduled-event')
      if (
        (scheduledEvent && rootRef.current?.contains(scheduledEvent)) ||
        target.closest('[data-slot^="dropdown-menu"]') ||
        target.closest('[data-slot="popover-content"]')
      ) return
      onTaskSelect(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onTaskSelect])

  useEffect(() => {
    rootRef.current
      ?.querySelectorAll<HTMLElement>('[data-calendar-task-id]')
      .forEach((element) => {
        element.setAttribute(
          'aria-selected',
          String(element.dataset.calendarTaskId === selectedTaskId),
        )
      })
  }, [calendarItems, selectedTaskId])

  useEffect(() => () => {
    document.body.classList.remove('calendar-is-manipulating')
  }, [])

  function setManipulating(active: boolean) {
    document.body.classList.toggle('calendar-is-manipulating', active)
  }

  return (
    <div ref={rootRef} className="calendar-grid-scroll min-h-0 flex-1 overflow-x-auto overscroll-contain">
      <div className={`planomy-calendar h-full ${calendarMinimumWidth(viewMode)}`}>
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
                  {info.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              </div>
            ) : (
              <div className="planomy-calendar-day-heading">
                <span className="planomy-calendar-weekday">
                  {info.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className={`planomy-calendar-day-number ${info.isToday ? 'is-today' : ''}`}>
                  {info.date.getDate()}
                </span>
              </div>
            )
          }
          dayCellContent={(info) =>
            info.view.type === 'dayGridMonth' ? (
              <span className={`planomy-month-day-number ${info.isToday ? 'is-today' : ''}`}>
                {info.date.getDate()}
              </span>
            ) : null
          }
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:30:00"
          scrollTimeReset={false}
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          defaultTimedEventDuration="00:15:00"
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
          eventResizableFromStart={false}
          eventDragMinDistance={6}
          dragScroll
          dragRevertDuration={140}
          longPressDelay={250}
          eventLongPressDelay={220}
          selectable={interactiveTimeGrid}
          selectMirror
          selectMinDistance={6}
          selectLongPressDelay={250}
          selectAllow={(info) => !info.allDay && isSingleDayTimedRange(info.start, info.end)}
          eventAllow={(dropInfo, draggedEvent) =>
            draggedEvent?.extendedProps.kind === 'scheduled-task' &&
            !dropInfo.allDay &&
            isSingleDayTimedRange(dropInfo.start, dropInfo.end)
          }
          displayEventTime={false}
          eventDisplay="block"
          events={fullCalendarEvents}
          eventOrder="order,start,title,id"
          eventOrderStrict
          slotEventOverlap={false}
          eventMaxStack={4}
          eventMinHeight={24}
          eventShortHeight={38}
          dayMaxEvents={3}
          fixedWeekCount={false}
          showNonCurrentDates
          moreLinkClick="popover"
          moreLinkContent={(info) => `+${info.num}`}
          datesSet={(info) => {
            onRangeLabelChange(formatRangeLabel(viewMode, info.start, info.end, info.view.currentStart))
            onRangeChange({
              startsAt: info.start.toISOString(),
              endsAt: info.end.toISOString(),
              startsOn: localDateKey(info.start),
              endsOn: localDateKey(info.end),
            })
          }}
          select={(info) => {
            if (!interactiveTimeGrid || info.allDay) return
            onTaskSelect(null)
            setDraft({
              startsAt: info.start,
              endsAt: info.end,
              anchor: anchorFromEvent(info.jsEvent, rootRef.current),
              title: '',
              listId: null,
            })
            info.view.calendar.unselect()
          }}
          dateClick={(info) => {
            if (!interactiveTimeGrid || info.allDay) return
            onTaskSelect(null)
            setDraft({
              startsAt: info.date,
              endsAt: null,
              anchor: anchorFromEvent(info.jsEvent, rootRef.current),
              title: '',
              listId: null,
            })
          }}
          eventClassNames={(info) => {
            const item = itemById.get(info.event.id)
            const kind = info.event.extendedProps.kind
            return [
              kind === 'create-draft' || (!item && info.isMirror)
                ? 'planomy-create-draft'
                : item?.kind === 'due-task'
                  ? 'planomy-due-event'
                  : item?.kind === 'scheduled-task'
                    ? 'planomy-scheduled-event'
                    : 'planomy-native-event',
              info.view.type === 'dayGridMonth' ? 'is-month' : 'is-time-grid',
              item?.kind === 'scheduled-task' && item.task.id === selectedTaskId ? 'is-selected' : '',
              item?.kind === 'scheduled-task' && busyTaskIds.has(item.task.id) ? 'is-saving' : '',
              info.isMirror || info.isDragging || info.isResizing ? 'is-interaction-preview' : '',
            ]
          }}
          eventContent={(info) => {
            const item = itemById.get(info.event.id)
            if (info.event.extendedProps.kind === 'create-draft') {
              const persistedEnd = info.event.extendedProps.persistedEnd as string | null
              return (
                <div className="planomy-calendar-block-content planomy-create-draft-content">
                  <div className="planomy-calendar-block-title">{info.event.title || 'New task'}</div>
                  <span className="planomy-calendar-block-time">
                    {info.event.start?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {` – ${taskDisplayEnd(
                      info.event.start ?? new Date(),
                      persistedEnd ? new Date(persistedEnd) : null,
                    ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                  </span>
                </div>
              )
            }
            if (!item && info.isMirror) {
              return (
                <div className="planomy-calendar-block-content planomy-create-draft-content">
                  <div className="planomy-calendar-block-title">New task</div>
                  <span className="planomy-calendar-block-time">
                    {info.event.start?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {` – ${taskDisplayEnd(info.event.start ?? new Date(), info.event.end ?? null).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                  </span>
                </div>
              )
            }
            if (!item) return null

            const livePreview = info.isMirror || info.isDragging || info.isResizing
            return (
              <CalendarItemContent
                item={item}
                compact={info.view.type === 'dayGridMonth'}
                displayStartsAt={livePreview ? info.event.start?.toISOString() : undefined}
                displayEndsAt={livePreview ? info.event.end?.toISOString() ?? null : undefined}
                interactionPreview={livePreview}
                selected={item.kind === 'scheduled-task' && item.task.id === selectedTaskId}
                onOpenTask={item.kind === 'scheduled-task' ? () => onTaskOpen(item.task.id) : undefined}
                onUnschedule={item.kind === 'scheduled-task' ? () => { void onTaskUnschedule(item.task) } : undefined}
                onSetDuration={item.kind === 'scheduled-task' ? (minutes) => {
                  void onTaskSchedule(item.task, new Date(item.startsAt), durationEnd(new Date(item.startsAt), minutes))
                } : undefined}
                onToggleComplete={item.kind === 'scheduled-task' ? () => { void onTaskComplete(item.task) } : undefined}
              />
            )
          }}
          eventDidMount={(info) => {
            const item = itemById.get(info.event.id)
            const draftColor = info.event.extendedProps.kind === 'create-draft'
              && isListColor(info.event.extendedProps.listColor)
              ? info.event.extendedProps.listColor
              : null
            if (!item && !draftColor) return
            const color = item
              ? item.kind === 'event' ? item.event.list?.color : item.task.list?.color
              : draftColor
            info.el.style.setProperty('--list-color', listColorCssValue(color))
            if (!item) return
            if (item.kind === 'due-task') {
              const dueTime = item.dueTimeLabel ? ` at ${item.dueTimeLabel}` : ''
              info.el.setAttribute('aria-label', `${item.task.title}, due ${item.dateKey}${dueTime}`)
            }
            if (item.kind === 'scheduled-task') {
              info.el.setAttribute('aria-label', `Scheduled task: ${item.task.title}`)
              info.el.dataset.calendarTaskId = item.task.id
              info.el.setAttribute('aria-selected', String(item.task.id === selectedTaskId))
              info.el.querySelector<HTMLElement>('.fc-event-resizer-end')?.setAttribute(
                'aria-label',
                `Resize scheduled duration for ${item.task.title}`,
              )
            }
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault()
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task' && interactiveTimeGrid) {
              clearInteraction()
              onTaskSelect(item.task.id)
              info.el.focus()
            } else if (item?.kind === 'due-task' || item?.kind === 'scheduled-task') {
              onTaskOpen(item.task.id)
            }
          }}
          eventDragStart={(info) => {
            clearInteraction()
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task') onTaskSelect(item.task.id)
            setManipulating(true)
          }}
          eventDragStop={() => setManipulating(false)}
          eventDrop={(info) => {
            const item = itemById.get(info.event.id)
            if (item?.kind !== 'scheduled-task' || !info.event.start) {
              info.revert()
              return
            }
            const end = taskDisplayEnd(info.event.start, info.event.end ?? null)
            void onTaskSchedule(item.task, info.event.start, end).then((saved) => {
              if (!saved) info.revert()
            })
          }}
          eventResizeStart={(info) => {
            clearInteraction()
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task') onTaskSelect(item.task.id)
            setManipulating(true)
          }}
          eventResizeStop={() => setManipulating(false)}
          eventResize={(info) => {
            const item = itemById.get(info.event.id)
            if (item?.kind !== 'scheduled-task' || !info.event.start || !info.event.end) {
              info.revert()
              return
            }
            void onTaskSchedule(item.task, info.event.start, info.event.end).then((saved) => {
              if (!saved) info.revert()
            })
          }}
        />
      </div>

      {draft ? (
        <CalendarQuickCreate
            draft={draft}
            lists={lists}
            onDraftTitleChange={changeDraftTitle}
            onDraftListChange={changeDraftList}
            onDraftRangeChange={changeDraftRange}
          onCancel={() => setDraft(null)}
          onCreate={onQuickCreate}
        />
      ) : null}
    </div>
  )
}
