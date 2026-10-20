'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { useDroppable } from '@dnd-kit/core'
import { AlertTriangle, ChevronLeft, ChevronRight, Clock3, Repeat, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import type { QuickCreateInput } from '@/components/calendar/calendar-quick-create'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/task-edit-dialog'
import { projectCalendarItems } from '@/lib/calendar-items'
import { shiftDay } from '@/lib/agenda'
import { formatHour } from '@/lib/calendar-preferences'
import { localDateKey } from '@/lib/today'
import type { CalendarRangeInput } from '@/lib/events'
import type { AgendaBlock, TaskWithList } from '@/types'
import { updateTaskOccurrenceSkipped, updateTaskOccurrenceTimingWithScope } from '@/components/tasks/recurrence-actions'
import { notifyTasksChanged } from '@/components/tasks/mutations'
import { useAgenda } from './agenda-provider'
import { useCalendarPreferences } from '@/components/settings/calendar-preferences-provider'
import type { RecurrenceScope } from '@/lib/recurrence-scope'
import type { TaskOccurrenceContext } from '@/components/tasks/task-form/task-occurrence-context'

const desktopQuery = '(min-width: 1280px)'
const ignoreRange: (range: CalendarRangeInput) => void = () => undefined
const ignoreLabel: (label: string) => void = () => undefined
const CalendarView = dynamic(
  () => import('@/components/calendar/calendar-view'),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full animate-pulse bg-surface motion-reduce:animate-none"
        aria-label="Loading calendar"
      />
    ),
  },
)

function subscribe(listener: () => void) {
  const query = window.matchMedia(desktopQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function restoreFocus() {
  document.querySelector<HTMLButtonElement>('[data-agenda-toggle]')?.focus()
}

function PlannerSlotDropTarget({ instant }: { instant: number }) {
  const { preferences } = useCalendarPreferences()
  const { setNodeRef } = useDroppable({
    id: `agenda-slot:${instant}`,
    data: { kind: 'agenda-slot', instant },
  })
  const date = new Date(instant)
  const hourLabel =
    date.getMinutes() === 0
      ? formatHour(date, preferences.timeFormat).replace(/\s+/g, '').toLowerCase()
      : null

  return (
    <span
      ref={setNodeRef}
      aria-hidden="true"
      className="planner-calendar-slot pointer-events-none relative block h-full min-h-[1.225rem] w-full"
    >
      {hourLabel ? (
        <span className="planner-calendar-hour-label">{hourLabel}</span>
      ) : null}
    </span>
  )
}

export default function AgendaPanel() {
  const {
    open,
    setOpen,
    blocks,
    dueTasks,
    lists,
    categories,
  } = useAgenda()
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  )
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingOccurrence, setEditingOccurrence] = useState<TaskOccurrenceContext | undefined>(undefined)
  const [reopenAfterEdit, setReopenAfterEdit] = useState(false)
  const editingTask = useMemo(() => {
    if (!editingTaskId) return null
    return (
      dueTasks.find(task => task.id === editingTaskId) ??
      blocks.find(block => block.task_id === editingTaskId)?.task ??
      null
    )
  }, [blocks, dueTasks, editingTaskId])

  function openTask(taskId: string, occurrence?: TaskOccurrenceContext) {
    setEditingTaskId(taskId)
    setEditingOccurrence(occurrence)
    if (!desktop) {
      setReopenAfterEdit(open)
      setOpen(false)
    }
  }

  const planner = desktop ? (
    open ? (
      <aside
        id="daily-agenda"
        aria-label="Today planner"
        className="agenda-calendar flex h-full w-[352px] shrink-0 flex-col border-l"
      >
        <PlannerCalendar onTaskOpen={openTask} />
      </aside>
    ) : null
  ) : (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        id="daily-agenda"
        showCloseButton={false}
        className="agenda-calendar w-[min(100vw,380px)] gap-0 p-0"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (!editingTaskId) restoreFocus()
        }}
      >
        <SheetTitle className="sr-only">Today planner</SheetTitle>
        <SheetDescription className="sr-only">
          Create and schedule tasks on today’s calendar.
        </SheetDescription>
        <PlannerCalendar onTaskOpen={openTask} />
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {planner}
      {editingTask ? (
        <TaskEditDialog
          task={editingTask}
          lists={lists}
          categories={categories}
          currentListId={editingTask.list_id}
          open
          onOpenChange={(nextOpen) => {
            if (nextOpen) return
            setEditingTaskId(null)
            setEditingOccurrence(undefined)
            if (reopenAfterEdit) {
              setReopenAfterEdit(false)
              setOpen(true)
            }
          }}
          occurrence={editingOccurrence}
        />
      ) : null}
    </>
  )
}

function PlannerCalendar({
  onTaskOpen,
}: {
  onTaskOpen: (taskId: string, occurrence?: TaskOccurrenceContext) => void
}) {
  const { preferences: calendarPreferences } = useCalendarPreferences()
  const {
    day,
    setDay,
    setOpen,
    blocks,
    dueTasks,
    events,
    lists,
    categories,
    loading,
    error,
    reload,
    save,
    skip,
    complete,
    create,
    busy,
    preview,
    attention,
  } = useAgenda()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [attentionOpen, setAttentionOpen] = useState(false)
  const isToday = day === localDateKey()

  function navigateDay(offset: number) {
    setDay(shiftDay(day, offset))
  }

  function returnToToday() {
    setDay(localDateKey())
  }

  const displayedBlocks = useMemo(() => {
    if (!preview) return blocks
    const previewBlock: AgendaBlock = {
      id: preview.sessionId ?? `preview:${preview.task.id}`,
      task_id: preview.task.id,
      user_id: preview.task.user_id,
      starts_at: new Date(preview.start).toISOString(),
      ends_at: new Date(preview.end).toISOString(),
      status: 'scheduled',
      task: preview.task,
    }
    return [
      ...blocks.filter(block => (block.id ?? `${block.task_id}:${block.starts_at}`) !== preview.sessionId),
      previewBlock,
    ]
  }, [blocks, preview])
  const calendarItems = useMemo(
    () => projectCalendarItems(dueTasks, displayedBlocks, events, calendarPreferences.timeFormat),
    [calendarPreferences.timeFormat, displayedBlocks, dueTasks, events],
  )
  async function schedule(task: TaskWithList, startsAt: Date, endsAt: Date | null, sessionId?: string, occurrenceId?: string | null, sessionIndex?: number | null, scope: RecurrenceScope = 'this') {
    if (scope !== 'this' && occurrenceId && sessionId) {
      try {
        await updateTaskOccurrenceTimingWithScope({
          taskId: task.id,
          occurrenceId,
          sessionId,
          sessionIndex,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt?.toISOString() ?? null,
          scope,
        })
        await reload()
        return true
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "Couldn't update recurring schedule.")
        return false
      }
    }
    return save(task, startsAt.getTime(), endsAt?.getTime() ?? null, sessionId)
  }

  function quickCreate(input: QuickCreateInput) {
    return create(input)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="agenda-calendar-header shrink-0 border-b border-border-subtle p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold">{isToday ? 'Today' : 'Planner'}</h2>
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm text-muted-foreground">
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <div className="flex shrink-0 items-center rounded-lg border border-border-subtle bg-surface p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous day"
                  className="rounded-md"
                  onClick={() => navigateDay(-1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next day"
                  className="rounded-md"
                  onClick={() => navigateDay(1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              {!isToday ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  onClick={returnToToday}
                >
                  Today
                </Button>
              ) : null}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Close Planner"
            onClick={() => {
              setOpen(false)
              restoreFocus()
            }}
          >
            <X />
          </Button>
        </div>
        {loading ? (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            Loading Planner…
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <span className="min-w-0 flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={() => void reload()}>
              Retry
            </Button>
          </div>
        ) : null}
        {!loading && !error && attention.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/65 p-2.5 text-xs dark:border-amber-400/20 dark:bg-amber-500/8">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left font-medium text-foreground"
              aria-expanded={attentionOpen}
              onClick={() => setAttentionOpen((value) => !value)}
            >
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" />
              <span>{attention.length} needing attention</span>
              <span className="ml-auto text-muted-foreground">{attentionOpen ? 'Hide' : 'View'}</span>
            </button>
            {attentionOpen ? (
              <div className="mt-2 divide-y divide-amber-200/70 rounded-md border border-amber-200/70 bg-white/55 dark:divide-amber-300/10 dark:border-amber-300/10 dark:bg-surface/50">
                {attention.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-2.5 py-2">
                    {item.kind === 'missed-session' ? <Clock3 className="size-3.5 shrink-0 text-amber-700/70 dark:text-amber-200/70" /> : <Repeat className="size-3.5 shrink-0 text-amber-700/70 dark:text-amber-200/70" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.task.title}</p>
                      <p className="truncate text-muted-foreground">
                        {item.kind === 'missed-session' && item.session
                          ? new Date(item.session.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                          : `${item.occurrences.length} missed occurrence${item.occurrences.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onTaskOpen(item.task.id)}>
                      {item.kind === 'missed-session' ? 'Reschedule' : 'Review'}
                    </Button>
                    {item.kind === 'missed-session' && item.session?.id ? (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => void skip(item.task.id, item.session!.id!, true)}>
                        Skip
                      </Button>
                    ) : item.occurrences.length === 1 ? (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => void updateTaskOccurrenceSkipped(item.occurrences[0].id, true).then(() => { notifyTasksChanged() })}>
                        Skip
                      </Button>
                    ) : null}
                  </div>
                ))}
                {attention.length > 3 ? <p className="px-2.5 py-2 text-muted-foreground">Open Home to review the remaining items.</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {!loading && !error && calendarItems.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Click or drag an empty time to create a task.
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 bg-surface">
        <CalendarView
          viewMode="day"
          command={null}
          date={day}
          showDayHeader={false}
          calendarItems={calendarItems}
          lists={lists}
          categories={categories}
          selectedTaskId={selectedTaskId}
          busyTaskIds={busy}
          onRangeLabelChange={ignoreLabel}
          onRangeChange={ignoreRange}
          onTaskSelect={setSelectedTaskId}
          onTaskOpen={onTaskOpen}
          onTaskSchedule={schedule}
          onTaskComplete={complete}
          onQuickCreate={quickCreate}
          renderSlotLaneContent={(date) => (
            <PlannerSlotDropTarget instant={date.getTime()} />
          )}
        />
      </div>

    </div>
  )
}
