'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { isListColor, listColorCssValue } from '@/lib/list-colors'
import {
  isTaskDeadlineOverdue,
  scheduledTaskProgress,
  scheduledTaskPhase,
  scheduledTaskState,
  type CalendarItem,
} from '@/lib/calendar-items'
import type { CalendarRangeInput } from '@/lib/events'
import {
  durationEnd,
  isSingleDayTimedRange,
  moveTimedRange,
  TASK_DRAG_DISTANCE,
  TASK_TOUCH_DELAY,
  taskDisplayEnd,
} from '@/lib/calendar-interactions'
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
  onTaskDelete,
  onTaskSkip,
  onTaskComplete,
  onQuickCreate,
  date,
  showDayHeader = true,
  renderSlotLaneContent,
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
  onTaskSchedule: (task: TaskWithList, startsAt: Date, endsAt: Date | null, sessionId?: string) => Promise<boolean>
  onTaskUnschedule: (task: TaskWithList, sessionId: string) => Promise<boolean>
  onTaskDelete: (task: TaskWithList) => Promise<boolean>
  onTaskSkip?: (task: TaskWithList, sessionId: string, skipped: boolean) => Promise<boolean>
  onTaskComplete: (task: TaskWithList, occurrenceId?: string | null) => Promise<boolean>
  onQuickCreate: (input: QuickCreateInput) => Promise<boolean>
  date?: string
  showDayHeader?: boolean
  renderSlotLaneContent?: (date: Date) => ReactNode
}) {
  const calendarRef = useRef<FullCalendar>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<QuickCreateDraft | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const submittingDraft = useRef(false)
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const suppressTaskClickRef = useRef(false)
  const initialScrollApplied = useRef(false)
  const itemById = useMemo(
    () => new Map(calendarItems.map((item) => [item.id, item])),
    [calendarItems],
  )
  const interactiveTimeGrid = viewMode === 'day' || viewMode === 'week'

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])
  const clearInteraction = useCallback(() => {
    if (submittingDraft.current) return
    setDraft(null)
    setOpenTaskMenuId(null)
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
          extendedProps: { kind: item.kind, sessionId: item.sessionId },
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

    if (draft && !savingDraft) {
      const selectedList = lists.find((list) => list.id === draft.listId)
      events.push({
        id: `calendar:create-draft:${draft.listId ?? 'none'}`,
        title: draft.title || 'New task',
        start: draft.startsAt.toISOString(),
        end: taskDisplayEnd(draft.startsAt, draft.endsAt).toISOString(),
        allDay: false,
        editable: interactiveTimeGrid,
        startEditable: interactiveTimeGrid,
        durationEditable: false,
        extendedProps: {
          kind: 'create-draft',
          listColor: selectedList?.color ?? null,
        },
      })
    }
    return events
  }, [busyTaskIds, calendarItems, draft, interactiveTimeGrid, lists, savingDraft])

  async function createDraft(input: QuickCreateInput) {
    if (submittingDraft.current) return false
    submittingDraft.current = true
    setSavingDraft(true)
    try {
      return await onQuickCreate(input)
    } finally {
      submittingDraft.current = false
      setSavingDraft(false)
    }
  }

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
    if (!date) return
    const api = calendarRef.current?.getApi()
    if (api && localDateKey(api.getDate()) !== date) {
      clearInteraction()
      onTaskSelect(null)
      api.gotoDate(date)
    }
  }, [clearInteraction, date, onTaskSelect])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api || !interactiveTimeGrid || initialScrollApplied.current) return

    api.scrollToTime('00:00:00')
    initialScrollApplied.current = true
  }, [interactiveTimeGrid])

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
        const isSelected = element.dataset.calendarTaskId === selectedTaskId
        element.setAttribute(
          'aria-selected',
          String(isSelected),
        )
        element.setAttribute(
          'aria-expanded',
          String(element.dataset.calendarSessionId === openTaskMenuId),
        )
      })
  }, [calendarItems, openTaskMenuId, selectedTaskId])

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
          initialView={fullCalendarView[viewMode]}
          initialDate={date}
          firstDay={0}
          headerToolbar={false}
          height="100%"
          nowIndicator
          dayHeaders={showDayHeader}
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
          scrollTime="00:00:00"
          scrollTimeReset={false}
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          defaultTimedEventDuration="00:15:00"
          forceEventDuration={false}
          slotLabelInterval="01:00:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          slotLaneClassNames={(info) =>
            info.isToday && info.isPast ? ['is-past'] : []
          }
          slotLabelClassNames={(info) =>
            localDateKey(info.date) === localDateKey(now) &&
            info.date.getTime() < now.getTime()
              ? ['is-past']
              : []
          }
          slotLaneContent={renderSlotLaneContent
            ? (info) => info.date ? renderSlotLaneContent(info.date) : null
            : undefined}
          expandRows={false}
          weekends
          editable={false}
          eventResizableFromStart={false}
          eventDragMinDistance={TASK_DRAG_DISTANCE}
          dragScroll
          dragRevertDuration={140}
          longPressDelay={TASK_TOUCH_DELAY}
          eventLongPressDelay={TASK_TOUCH_DELAY}
          selectable={interactiveTimeGrid}
          selectMirror
          selectMinDistance={TASK_DRAG_DISTANCE}
          selectLongPressDelay={TASK_TOUCH_DELAY}
          selectAllow={(info) => !info.allDay && isSingleDayTimedRange(info.start, info.end)}
          eventAllow={(dropInfo, draggedEvent) =>
            ['create-draft', 'scheduled-task'].includes(
              draggedEvent?.extendedProps.kind,
            ) &&
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
            if (!interactiveTimeGrid || info.allDay || submittingDraft.current) return
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
            if (!interactiveTimeGrid || info.allDay || submittingDraft.current) return
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
            const deadlineOverdue =
              (item?.kind === 'due-task' || item?.kind === 'scheduled-task') &&
              isTaskDeadlineOverdue(item.task, now)
            const phase =
              item?.kind === 'scheduled-task'
                ? scheduledTaskPhase(item, now)
                : null
            return [
              kind === 'create-draft' || (!item && info.isMirror)
                ? 'planomy-create-draft'
                : item?.kind === 'due-task'
                  ? 'planomy-due-event'
                  : item?.kind === 'scheduled-task'
                    ? 'planomy-scheduled-event'
                    : 'planomy-native-event',
              info.view.type === 'dayGridMonth' ? 'is-month' : 'is-time-grid',
              kind === 'create-draft' ? 'is-draggable' : '',
              phase === 'past' ? 'is-plan-past' : '',
              phase === 'in-progress' ? 'is-in-progress' : '',
              item?.kind === 'scheduled-task' && scheduledTaskState(item, now) === 'missed' ? 'is-missed' : '',
              item?.kind === 'scheduled-task' && scheduledTaskState(item, now) === 'skipped' ? 'is-skipped' : '',
              item?.kind === 'scheduled-task' && scheduledTaskState(item, now) === 'completed' ? 'is-session-completed' : '',
              deadlineOverdue ? 'is-deadline-overdue' : '',
              item?.kind === 'scheduled-task' && item.task.id === selectedTaskId ? 'is-selected' : '',
              item?.kind === 'scheduled-task' && busyTaskIds.has(item.task.id) ? 'is-saving' : '',
              info.isMirror || info.isDragging || info.isResizing ? 'is-interaction-preview' : '',
            ]
          }}
          eventContent={(info) => {
            const item = itemById.get(info.event.id)
            if (info.event.extendedProps.kind === 'create-draft') {
              return (
                <div className="planomy-calendar-block-content planomy-create-draft-content">
                  <div className="planomy-calendar-block-title">{info.event.title || 'New task'}</div>
                  <span className="planomy-calendar-block-time">
                    {info.event.start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    {` – ${taskDisplayEnd(
                      info.event.start ?? new Date(),
                      info.event.end ?? null,
                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                  </span>
                </div>
              )
            }
            if (!item && info.isMirror) {
              return (
                <div className="planomy-calendar-block-content planomy-create-draft-content">
                  <div className="planomy-calendar-block-title">New task</div>
                  <span className="planomy-calendar-block-time">
                    {info.event.start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    {` – ${taskDisplayEnd(info.event.start ?? new Date(), info.event.end ?? null).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
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
                planProgress={
                  item.kind === 'scheduled-task'
                    ? scheduledTaskProgress(item, now)
                    : undefined
                }
                selected={
                  item.kind === 'scheduled-task' &&
                  item.task.id === selectedTaskId &&
                  !livePreview
                }
                menuOpen={
                  item.kind === 'scheduled-task'
                    ? item.sessionId === openTaskMenuId
                    : undefined
                }
                onMenuOpenChange={
                  item.kind === 'scheduled-task'
                    ? (open) => {
                        setOpenTaskMenuId(open ? item.sessionId : null)
                        if (open) onTaskSelect(item.task.id)
                      }
                    : undefined
                }
                onOpenTask={item.kind === 'scheduled-task' ? () => onTaskOpen(item.task.id) : undefined}
                onUnschedule={item.kind === 'scheduled-task' ? async () => {
                  const removed = await onTaskUnschedule(item.task, item.sessionId)
                  if (removed) {
                    setOpenTaskMenuId(null)
                    onTaskSelect(null)
                  }
                } : undefined}
                onDeleteTask={item.kind === 'scheduled-task' ? () => {
                  window.setTimeout(() => {
                    void onTaskDelete(item.task).then((deleted) => {
                      if (deleted) {
                        setOpenTaskMenuId(null)
                        onTaskSelect(null)
                      }
                    })
                  }, 0)
                } : undefined}
                onSetDuration={item.kind === 'scheduled-task' ? (minutes) => {
                  void onTaskSchedule(item.task, new Date(item.startsAt), durationEnd(new Date(item.startsAt), minutes), item.sessionId)
                } : undefined}
                onSkipSession={item.kind === 'scheduled-task' && onTaskSkip
                  ? () => onTaskSkip(item.task, item.sessionId, item.status !== 'skipped')
                  : undefined}
                onToggleComplete={item.kind === 'scheduled-task' ? () => { void onTaskComplete(item.task, item.occurrenceId) } : undefined}
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
              info.el.dataset.calendarSessionId = item.sessionId
              info.el.setAttribute('aria-selected', String(item.task.id === selectedTaskId))
              info.el.setAttribute('aria-haspopup', 'menu')
              info.el.querySelector<HTMLElement>('.fc-event-resizer-end')?.setAttribute(
                'aria-label',
                `Resize scheduled duration for ${item.task.title}`,
              )
            }
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault()
            if (suppressTaskClickRef.current) return
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task') {
              clearInteraction()
              onTaskSelect(item.task.id)
              setOpenTaskMenuId(item.sessionId)
              info.el.focus()
            } else if (item?.kind === 'due-task') {
              onTaskOpen(item.task.id)
            }
          }}
          eventDragStart={(info) => {
            suppressTaskClickRef.current = true
            const kind = info.event.extendedProps.kind
            if (kind !== 'create-draft') clearInteraction()
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task') onTaskSelect(item.task.id)
            setManipulating(true)
          }}
          eventDragStop={() => {
            setManipulating(false)
            window.setTimeout(() => {
              suppressTaskClickRef.current = false
            }, 0)
          }}
          eventDrop={(info) => {
            if (
              info.event.extendedProps.kind === 'create-draft' &&
              info.event.start &&
              draft
            ) {
              const moved = moveTimedRange(
                draft.startsAt,
                draft.endsAt,
                info.event.start,
              )
              changeDraftRange(moved.startsAt, moved.endsAt)
              return
            }

            const item = itemById.get(info.event.id)
            if (item?.kind !== 'scheduled-task' || !info.event.start) {
              info.revert()
              return
            }
            const end = taskDisplayEnd(info.event.start, info.event.end ?? null)
            void onTaskSchedule(item.task, info.event.start, end, item.sessionId).then((saved) => {
              if (!saved) info.revert()
            })
          }}
          eventResizeStart={(info) => {
            suppressTaskClickRef.current = true
            clearInteraction()
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task') onTaskSelect(item.task.id)
            setManipulating(true)
          }}
          eventResizeStop={() => {
            setManipulating(false)
            window.setTimeout(() => {
              suppressTaskClickRef.current = false
            }, 0)
          }}
          eventResize={(info) => {
            const item = itemById.get(info.event.id)
            if (item?.kind !== 'scheduled-task' || !info.event.start || !info.event.end) {
              info.revert()
              return
            }
            void onTaskSchedule(item.task, info.event.start, info.event.end, item.sessionId).then((saved) => {
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
          onCreate={createDraft}
        />
      ) : null}
    </div>
  )
}
