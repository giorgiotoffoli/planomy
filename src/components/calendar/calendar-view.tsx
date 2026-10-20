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
import { toast } from 'sonner'
import { isListColor, listColorCssValue, resolveEventColor, resolveInheritedColor } from '@/lib/list-colors'
import {
  isTaskDeadlineOverdue,
  isCalendarEventPast,
  scheduledTaskProgress,
  scheduledTaskPhase,
  scheduledTaskState,
  type CalendarItem,
} from '@/lib/calendar-items'
import { localDateAndTime, type CalendarRangeInput } from '@/lib/events'
import {
  isSingleDayTimedRange,
  moveTimedRange,
  snapCreationStart,
  TASK_DRAG_DISTANCE,
  TASK_TOUCH_DELAY,
  taskDisplayEnd,
} from '@/lib/calendar-interactions'
import { localDateKey } from '@/lib/today'
import type { CalendarEventWithList, Category, List, TaskWithList } from '@/types'
import { addCalendarDays } from '@/lib/today'
import {
  deleteEvent,
  deleteEventOccurrenceWithScope,
  updateEventTiming,
} from '@/components/events/actions'
import { notifyEventsChanged } from '@/components/events/mutations'
import { useCalendarPreferences } from '@/components/settings/calendar-preferences-provider'
import { formatTime } from '@/lib/calendar-preferences'
import EventDialog from '@/components/events/event-dialog'
import type { EventFormInitialValues } from '@/components/events/event-form'
import { deleteTask } from '@/components/tasks/actions'
import { notifyTasksChanged } from '@/components/tasks/mutations'
import { deleteTaskOccurrenceWithScope } from '@/components/tasks/recurrence-actions'
import { TaskDialog } from '@/components/tasks/task-form/task-dialog'
import type { TaskFormInitialValues } from '@/components/tasks/task-form/task-form'
import type { TaskOccurrenceContext } from '@/components/tasks/task-form/task-occurrence-context'
import { RecurrenceScopeDialog } from '@/components/recurrence/recurrence-scope-dialog'
import { recurrenceScopeOptionsForWeekday, type RecurrenceScope } from '@/lib/recurrence-scope'
import { recurrenceWeekdayName } from '@/lib/recurrence'
import CalendarItemContent from './calendar-item-content'
import CalendarItemMenu from './calendar-item-menu'
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
const calendarSnapDuration = '00:05:00'
const calendarCreationStartSnapDuration = '00:15:00'

function isRecurringCalendarItem(item: CalendarItem) {
  if (item.kind === 'event') {
    return Boolean(
      item.event.occurrence_key &&
        item.event.source_event_id &&
        item.event.recurrence_rule,
    )
  }

  return item.kind === 'scheduled-task' && Boolean(item.occurrenceId && item.task.recurrence_rule)
}

function eventLocalStart(event: CalendarEventWithList) {
  if (!event.starts_at) return { date: event.starts_on ?? localDateKey(), time: null }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: event.time_zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(event.starts_at))
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function eventTimingScopeOptions(event: CalendarEventWithList | undefined, proposedStart?: Date) {
  const occurrenceDate = event?.occurrence_key?.slice(0, 10)
  if (!event?.recurrence_rule?.weekdayTimes?.length || !occurrenceDate) return undefined
  if (proposedStart && event.starts_at && localDateAndTime(proposedStart.toISOString(), event.time_zone).date !== occurrenceDate) return undefined
  const [year, month, day] = occurrenceDate.split('-').map(Number)
  const weekday = ((new Date(year, month - 1, day, 12).getDay() + 6) % 7) + 1
  const weekdayName = recurrenceWeekdayName(weekday)
  return recurrenceScopeOptionsForWeekday(weekdayName)
}

function eventToTaskValues(event: CalendarEventWithList): TaskFormInitialValues {
  const start = eventLocalStart(event)
  return {
    title: event.title,
    notes: event.description ?? '',
    listId: event.list_id,
    categoryId: event.category_id ?? null,
    dueDate: start.date,
    dueTime: event.all_day ? null : start.time,
    focused: false,
    repeatRule: event.recurrence_rule,
  }
}

function taskToEventValues(item: Exclude<CalendarItem, { kind: 'event' }>): EventFormInitialValues {
  const task = item.task
  const shared = {
    title: task.title,
    description: task.notes ?? '',
    location: '',
    listId: task.list_id,
    categoryId: task.category_id ?? null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrenceRule: task.recurrence_rule,
  }

  if (item.kind === 'scheduled-task') {
    return {
      ...shared,
      allDay: false,
      startsAt: item.startsAt,
      endsAt: item.endsAt ?? '',
    }
  }

  return {
    ...shared,
    allDay: true,
    startsOn: item.dateKey,
    endsOn: addCalendarDays(item.dateKey, 1),
  }
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
  categories,
  selectedTaskId,
  busyTaskIds,
  onRangeLabelChange,
  onRangeChange,
  onTaskSelect,
  onTaskOpen,
  onTaskSchedule,
  onTaskComplete,
  onQuickCreate,
  createEventRequest,
  date,
  showDayHeader = true,
  compactGrid = false,
  renderSlotLaneContent,
}: {
  viewMode: CalendarViewMode
  command: CalendarCommand | null
  calendarItems: CalendarItem[]
  lists: List[]
  categories: Category[]
  selectedTaskId: string | null
  busyTaskIds: Set<string>
  onRangeLabelChange: (label: string) => void
  onRangeChange: (range: CalendarRangeInput) => void
  onTaskSelect: (taskId: string | null) => void
  onTaskOpen: (taskId: string, occurrence?: TaskOccurrenceContext) => void
  onTaskSchedule: (task: TaskWithList, startsAt: Date, endsAt: Date | null, sessionId?: string, occurrenceId?: string | null, sessionIndex?: number | null, scope?: RecurrenceScope) => Promise<boolean>
  onTaskComplete: (task: TaskWithList, occurrenceId?: string | null) => Promise<boolean>
  onQuickCreate: (input: QuickCreateInput) => Promise<boolean>
  createEventRequest?: { id: number; startsAt?: Date; endsAt?: Date | null } | null
  date?: string
  showDayHeader?: boolean
  compactGrid?: boolean
  renderSlotLaneContent?: (date: Date) => ReactNode
}) {
  const { preferences: calendarPreferences } = useCalendarPreferences()
  const calendarRef = useRef<FullCalendar>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<QuickCreateDraft | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const submittingDraft = useRef(false)
  const [eventDialog, setEventDialog] = useState<{
    event?: CalendarEventWithList
    startsAt?: Date
    endsAt?: Date | null
    initialValues?: EventFormInitialValues
  } | null>(null)
  const [taskDialog, setTaskDialog] = useState<{
    initialValues: TaskFormInitialValues
  } | null>(null)
  const [itemMenu, setItemMenu] = useState<{
    item: CalendarItem
    anchor: { x: number; y: number }
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CalendarItem | null>(null)
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [pendingEventTiming, setPendingEventTiming] = useState<{
    item: Extract<CalendarItem, { kind: 'event' }>
    start: Date
    end: Date | null
    allDay: boolean
    preservePoint: boolean
  } | null>(null)
  const [eventTimingScopeOpen, setEventTimingScopeOpen] = useState(false)
  const [eventTimingSaving, setEventTimingSaving] = useState(false)
  const [pendingTaskTiming, setPendingTaskTiming] = useState<{
    item: Extract<CalendarItem, { kind: 'scheduled-task' }>
    start: Date
    end: Date | null
  } | null>(null)
  const [taskTimingScopeOpen, setTaskTimingScopeOpen] = useState(false)
  const [taskTimingSaving, setTaskTimingSaving] = useState(false)
  const [busyEventIds, setBusyEventIds] = useState<Set<string>>(() => new Set())
  const [now, setNow] = useState(() => new Date())
  const suppressTaskClickRef = useRef(false)
  const initialScrollApplied = useRef(false)
  const creationSnapPendingRef = useRef(false)
  const itemById = useMemo(
    () => new Map(calendarItems.map((item) => [item.id, item])),
    [calendarItems],
  )
  const interactiveTimeGrid = viewMode === 'day' || viewMode === 'week'

  useEffect(() => {
    if (!createEventRequest) return
    const request = window.setTimeout(() => setEventDialog({
      startsAt: createEventRequest.startsAt,
      endsAt: createEventRequest.endsAt,
    }), 0)
    return () => window.clearTimeout(request)
  }, [createEventRequest])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])
  const clearInteraction = useCallback(() => {
    if (submittingDraft.current) return
    setDraft(null)
    setItemMenu(null)
    calendarRef.current?.getApi().unselect()
  }, [])
  const clearCreationSurface = useCallback(() => {
    if (submittingDraft.current) return
    setDraft(null)
    setEventDialog(null)
    setTaskDialog(null)
    setItemMenu(null)
    calendarRef.current?.getApi().unselect()
  }, [])
  const restoreCalendarSnap = useCallback(() => {
    creationSnapPendingRef.current = false
    calendarRef.current?.getApi().setOption('snapDuration', calendarSnapDuration)
  }, [])
  const handleCalendarPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('.fc-event')) return
    if (!target.closest('.fc-timegrid-slot-lane, .fc-timegrid-col')) return

    clearCreationSurface()
    calendarRef.current?.getApi().setOption('snapDuration', calendarCreationStartSnapDuration)
    creationSnapPendingRef.current = true
    onTaskSelect(null)
  }, [clearCreationSurface, onTaskSelect])
  const handleCalendarPointerMove = useCallback(() => {
    if (!creationSnapPendingRef.current) return
    restoreCalendarSnap()
  }, [restoreCalendarSnap])
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
        editable: !busyEventIds.has(item.event.source_event_id ?? item.event.id),
        startEditable: true,
        durationEditable: true,
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
  }, [busyEventIds, busyTaskIds, calendarItems, draft, interactiveTimeGrid, lists, savingDraft])

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

  async function moveEvent(
    item: Extract<CalendarItem, { kind: 'event' }>,
    start: Date,
    end: Date | null,
    allDay: boolean,
    preservePoint = false,
    scope: RecurrenceScope = 'this',
  ) {
    const event = item.event
    const sourceId = event.source_event_id ?? event.id
    const busyId = sourceId
    setBusyEventIds((current) => new Set(current).add(busyId))
    try {
      if (allDay) {
        const startsOn = localDateKey(start)
        const endsOn = localDateKey(end ?? new Date(start.getTime() + 86_400_000))
        await updateEventTiming(sourceId, event.occurrence_key ?? null, {
          allDay: true,
          startsOn,
          endsOn,
        }, scope)
      } else {
        await updateEventTiming(sourceId, event.occurrence_key ?? null, {
          allDay: false,
          startsAt: start.toISOString(),
          endsAt: preservePoint && event.ends_at === null ? null : end?.toISOString() ?? null,
        }, scope)
      }
      notifyEventsChanged()
      return true
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Event time could not be saved.')
      return false
    } finally {
      setBusyEventIds((current) => {
        const next = new Set(current)
        next.delete(busyId)
        return next
      })
    }
  }

  function openItemEditor(item: CalendarItem) {
    setItemMenu(null)
    clearInteraction()
    if (item.kind === 'event') {
      setEventDialog({ event: item.event })
      return
    }

    onTaskSelect(item.task.id)
    onTaskOpen(
      item.task.id,
      item.kind === 'scheduled-task' && item.occurrenceId
        ? {
            occurrenceId: item.occurrenceId,
            occurrenceDate: localDateKey(new Date(item.startsAt)),
            sessionId: item.sessionId,
            sessionIndex: item.sessionIndex,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
          }
        : undefined,
    )
  }

  function convertItem(item: CalendarItem) {
    setItemMenu(null)
    clearInteraction()
    if (item.kind === 'event') {
      setTaskDialog({ initialValues: eventToTaskValues(item.event) })
      return
    }

    setEventDialog({
      initialValues: taskToEventValues(item),
      ...(item.kind === 'scheduled-task'
        ? {
            startsAt: new Date(item.startsAt),
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
          }
        : {}),
    })
  }

  function requestDelete(item: CalendarItem) {
    setItemMenu(null)
    if (!isRecurringCalendarItem(item)) {
      void deleteItem(item, 'this')
      return
    }
    setPendingDelete(item)
    setDeleteScopeOpen(true)
  }

  async function deleteItem(item: CalendarItem, scope: RecurrenceScope) {
    if (deleteSaving) return
    setDeleteSaving(true)
    try {
      if (item.kind === 'event') {
        if (item.event.occurrence_key && item.event.source_event_id) {
          await deleteEventOccurrenceWithScope(
            item.event.source_event_id,
            item.event.occurrence_key,
            scope,
          )
        } else {
          await deleteEvent(item.event.id)
        }
        notifyEventsChanged()
        toast.success('Event deleted')
      } else if (
        item.kind === 'scheduled-task' &&
        item.occurrenceId &&
        item.task.recurrence_rule
      ) {
        await deleteTaskOccurrenceWithScope(item.task.id, item.occurrenceId, scope)
        notifyTasksChanged()
        toast.success('Task occurrence deleted')
      } else {
        await deleteTask(item.task.id)
        notifyTasksChanged()
        toast.success('Task deleted')
      }
      setPendingDelete(null)
      setDeleteScopeOpen(false)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Item could not be deleted.')
    } finally {
      setDeleteSaving(false)
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

    api.scrollToTime(compactGrid ? '08:00:00' : '00:00:00')
    initialScrollApplied.current = true
  }, [compactGrid, interactiveTimeGrid])

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
      })
  }, [calendarItems, selectedTaskId])

  useEffect(() => () => {
    document.body.classList.remove('calendar-is-manipulating')
  }, [])

  function setManipulating(active: boolean) {
    document.body.classList.toggle('calendar-is-manipulating', active)
  }

  return (
    <div
      ref={rootRef}
      onPointerDownCapture={handleCalendarPointerDown}
      onPointerMoveCapture={handleCalendarPointerMove}
      onPointerUpCapture={restoreCalendarSnap}
      onPointerCancelCapture={restoreCalendarSnap}
      className="calendar-grid-scroll min-h-0 flex-1 overflow-x-auto overscroll-contain"
    >
      <div className={`planomy-calendar h-full ${compactGrid ? 'is-compact' : ''} ${calendarMinimumWidth(viewMode)}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={calendarPlugins}
          initialView={fullCalendarView[viewMode]}
          initialDate={date}
          firstDay={calendarPreferences.firstDay}
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
          scrollTime={compactGrid ? '08:00:00' : '00:00:00'}
          scrollTimeReset={false}
          slotDuration="00:30:00"
          snapDuration={calendarSnapDuration}
          defaultTimedEventDuration="00:15:00"
          forceEventDuration={false}
          slotLabelInterval="01:00:00"
          slotLabelFormat={{
            hour: calendarPreferences.timeFormat === '12h' ? 'numeric' : '2-digit',
            minute: '2-digit',
            hour12: calendarPreferences.timeFormat === '12h',
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
          eventAllow={(dropInfo, draggedEvent) => {
            const kind = draggedEvent?.extendedProps.kind
            if (kind === 'event') return true
            return ['create-draft', 'scheduled-task'].includes(kind) &&
              !dropInfo.allDay &&
              isSingleDayTimedRange(dropInfo.start, dropInfo.end)
          }}
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
            restoreCalendarSnap()
            clearCreationSurface()
            onTaskSelect(null)
            const startsAt = snapCreationStart(info.start)
            setDraft({
              startsAt,
              endsAt: info.end,
              anchor: anchorFromEvent(info.jsEvent, rootRef.current),
              title: '',
              listId: null,
            })
            info.view.calendar.unselect()
          }}
          dateClick={(info) => {
            if (!interactiveTimeGrid || info.allDay || submittingDraft.current) return
            restoreCalendarSnap()
            clearCreationSurface()
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
            const eventPast = item?.kind === 'event' && isCalendarEventPast(item.event, now)
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
              eventPast ? 'is-plan-past' : '',
              phase === 'in-progress' ? 'is-in-progress' : '',
              item?.kind === 'scheduled-task' && scheduledTaskState(item, now) === 'missed' ? 'is-missed' : '',
              item?.kind === 'scheduled-task' && scheduledTaskState(item, now) === 'skipped' ? 'is-skipped' : '',
              item?.kind === 'scheduled-task' && scheduledTaskState(item, now) === 'completed' ? 'is-session-completed' : '',
              deadlineOverdue ? 'is-deadline-overdue' : '',
              item?.kind === 'scheduled-task' && item.task.id === selectedTaskId ? 'is-selected' : '',
              item?.kind === 'scheduled-task' && busyTaskIds.has(item.task.id) ? 'is-saving' : '',
              info.event.allDay ? 'is-all-day' : '',
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
                    {info.event.start ? formatTime(info.event.start, calendarPreferences.timeFormat) : null}
                    {` – ${formatTime(taskDisplayEnd(
                      info.event.start ?? new Date(),
                      info.event.end ?? null,
                    ), calendarPreferences.timeFormat)}`}
                  </span>
                </div>
              )
            }
            if (!item && info.isMirror) {
              return (
                <div className="planomy-calendar-block-content planomy-create-draft-content">
                  <div className="planomy-calendar-block-title">New task</div>
                  <span className="planomy-calendar-block-time">
                    {info.event.start ? formatTime(info.event.start, calendarPreferences.timeFormat) : null}
                    {` – ${formatTime(taskDisplayEnd(info.event.start ?? new Date(), info.event.end ?? null), calendarPreferences.timeFormat)}`}
                  </span>
                </div>
              )
            }
            if (!item) return null

            const livePreview = info.isMirror || info.isDragging || info.isResizing
            return (
              <CalendarItemContent
                item={item}
                timeFormat={calendarPreferences.timeFormat}
                compact={info.view.type === 'dayGridMonth'}
                displayStartsAt={livePreview ? info.event.start?.toISOString() : undefined}
                displayEndsAt={livePreview ? info.event.end?.toISOString() ?? null : undefined}
                interactionPreview={livePreview}
                planProgress={
                  item.kind === 'scheduled-task'
                    ? scheduledTaskProgress(item, now)
                    : undefined
                }
                onToggleComplete={item.kind === 'scheduled-task'
                  ? () => { void onTaskComplete(item.task, item.occurrenceId) }
                  : item.kind === 'due-task'
                    ? () => { void onTaskComplete(item.task) }
                    : undefined}
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
              ? item.kind === 'event'
                ? resolveEventColor(item.event.color, item.event.category?.color, item.event.list?.color)
                : resolveInheritedColor(item.task.category?.color, item.task.list?.color)
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
              info.el.querySelector<HTMLElement>('.fc-event-resizer-end')?.setAttribute(
                'aria-label',
                `Resize scheduled duration for ${item.task.title}`,
              )
            }
            if (item.kind === 'event') {
              info.el.setAttribute('aria-label', `${item.event.title}${item.event.all_day ? ', all day' : ''}`)
              info.el.dataset.calendarEventId = item.id
            }
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault()
            if (suppressTaskClickRef.current) return
            const item = itemById.get(info.event.id)
            if (item?.kind === 'scheduled-task' || item?.kind === 'due-task') {
              clearInteraction()
              onTaskSelect(item.task.id)
              setItemMenu({
                item,
                anchor: anchorFromEvent(info.jsEvent, info.el),
              })
              info.el.focus()
              return
            }
            if (item && isRecurringCalendarItem(item)) {
              clearInteraction()
              setItemMenu({
                item,
                anchor: anchorFromEvent(info.jsEvent, info.el),
              })
              info.el.focus()
              return
            }
            if (item?.kind === 'event') {
              openItemEditor(item)
              info.el.focus()
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
            if (item?.kind === 'event' && info.event.start) {
              if (item.event.occurrence_key && item.event.source_event_id && item.event.recurrence_rule) {
                info.revert()
                setPendingEventTiming({
                  item,
                  start: info.event.start,
                  end: info.event.end,
                  allDay: info.event.allDay,
                  preservePoint: true,
                })
                setEventTimingScopeOpen(true)
                return
              }
              void moveEvent(item, info.event.start, info.event.end, info.event.allDay, true).then((saved) => {
                if (!saved) info.revert()
              })
              return
            }
            if (item?.kind !== 'scheduled-task' || !info.event.start) {
              info.revert()
              return
            }
            const end = taskDisplayEnd(info.event.start, info.event.end ?? null)
            if (item.occurrenceId && item.task.recurrence_rule) {
              info.revert()
              setPendingTaskTiming({ item, start: info.event.start, end })
              setTaskTimingScopeOpen(true)
              return
            }
            void onTaskSchedule(item.task, info.event.start, end, item.sessionId, item.occurrenceId, item.sessionIndex).then((saved) => {
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
            if (item?.kind === 'event' && info.event.start) {
              if (item.event.occurrence_key && item.event.source_event_id && item.event.recurrence_rule) {
                info.revert()
                setPendingEventTiming({
                  item,
                  start: info.event.start,
                  end: info.event.end,
                  allDay: info.event.allDay,
                  preservePoint: false,
                })
                setEventTimingScopeOpen(true)
                return
              }
              void moveEvent(item, info.event.start, info.event.end, info.event.allDay).then((saved) => {
                if (!saved) info.revert()
              })
              return
            }
            if (item?.kind !== 'scheduled-task' || !info.event.start || !info.event.end) {
              info.revert()
              return
            }
            if (item.occurrenceId && item.task.recurrence_rule) {
              info.revert()
              setPendingTaskTiming({ item, start: info.event.start, end: info.event.end })
              setTaskTimingScopeOpen(true)
              return
            }
            void onTaskSchedule(item.task, info.event.start, info.event.end, item.sessionId, item.occurrenceId, item.sessionIndex).then((saved) => {
              if (!saved) info.revert()
            })
          }}
        />
      </div>

      {itemMenu ? (
        <CalendarItemMenu
          item={itemMenu.item}
          anchor={itemMenu.anchor}
          onOpenChange={(open) => {
            if (!open) setItemMenu(null)
          }}
          onEdit={() => openItemEditor(itemMenu.item)}
          onConvert={() => convertItem(itemMenu.item)}
          onDelete={() => requestDelete(itemMenu.item)}
        />
      ) : null}
      {draft ? (
        <CalendarQuickCreate
            draft={draft}
            lists={lists}
            onDraftTitleChange={changeDraftTitle}
            onDraftListChange={changeDraftList}
            onDraftRangeChange={changeDraftRange}
          onCancel={() => setDraft(null)}
          onCreate={createDraft}
          onCreateEvent={(input) => {
            setDraft(null)
            setEventDialog({
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              initialValues: { title: input.title, listId: input.listId },
            })
          }}
        />
      ) : null}
      {eventDialog ? (
        <EventDialog
          lists={lists}
          categories={categories}
          event={eventDialog.event}
          seed={{ startsAt: eventDialog.startsAt, endsAt: eventDialog.endsAt }}
          initialValues={eventDialog.initialValues}
          open
          onOpenChange={(open) => { if (!open) setEventDialog(null) }}
        />
      ) : null}
      {taskDialog ? (
        <TaskDialog
          mode="create"
          lists={lists}
          categories={categories}
          initialValues={taskDialog.initialValues}
          open
          onOpenChange={(open) => {
            if (!open) setTaskDialog(null)
          }}
        />
      ) : null}
      <RecurrenceScopeDialog
        open={deleteScopeOpen && Boolean(pendingDelete)}
        action="delete"
        itemLabel={pendingDelete?.kind === 'event' ? 'event' : 'task'}
        busy={deleteSaving}
        onCancel={() => {
          if (deleteSaving) return
          setDeleteScopeOpen(false)
          setPendingDelete(null)
        }}
        onConfirm={(scope) => {
          if (pendingDelete) void deleteItem(pendingDelete, scope)
        }}
      />
      <RecurrenceScopeDialog
        open={eventTimingScopeOpen}
        action="edit"
        itemLabel="event"
        scopeOptions={eventTimingScopeOptions(pendingEventTiming?.item.event, pendingEventTiming?.start)}
        busy={eventTimingSaving}
        onCancel={() => {
          if (eventTimingSaving) return
          setEventTimingScopeOpen(false)
          setPendingEventTiming(null)
        }}
        onConfirm={(scope) => {
          if (!pendingEventTiming) return
          const pending = pendingEventTiming
          setEventTimingSaving(true)
          void moveEvent(pending.item, pending.start, pending.end, pending.allDay, pending.preservePoint, scope)
            .then(() => {
              setEventTimingScopeOpen(false)
              setPendingEventTiming(null)
            })
            .finally(() => setEventTimingSaving(false))
        }}
      />
      <RecurrenceScopeDialog
        open={taskTimingScopeOpen}
        action="edit"
        itemLabel="task"
        availableScopes={pendingTaskTiming?.item.sessionIndex === null ? ['this'] : undefined}
        busy={taskTimingSaving}
        onCancel={() => {
          if (taskTimingSaving) return
          setTaskTimingScopeOpen(false)
          setPendingTaskTiming(null)
        }}
        onConfirm={(scope) => {
          if (!pendingTaskTiming) return
          const pending = pendingTaskTiming
          setTaskTimingSaving(true)
          void onTaskSchedule(
            pending.item.task,
            pending.start,
            pending.end,
            pending.item.sessionId,
            pending.item.occurrenceId,
            pending.item.sessionIndex,
            scope,
          ).then((saved) => {
            if (saved) {
              setTaskTimingScopeOpen(false)
              setPendingTaskTiming(null)
            }
          }).finally(() => setTaskTimingSaving(false))
        }}
      />
    </div>
  )
}
