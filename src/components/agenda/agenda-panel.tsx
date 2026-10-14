'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { X } from 'lucide-react'
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
import type { CalendarRangeInput } from '@/lib/events'
import type { AgendaBlock, TaskWithList } from '@/types'
import { useAgenda } from './agenda-provider'

const desktopQuery = '(min-width: 1280px)'
const ignoreRange: (range: CalendarRangeInput) => void = () => undefined
const ignoreLabel: (label: string) => void = () => undefined
const plannerHourFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
})
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
  const { setNodeRef } = useDroppable({
    id: `agenda-slot:${instant}`,
    data: { kind: 'agenda-slot', instant },
  })
  const date = new Date(instant)
  const hourLabel =
    date.getMinutes() === 0
      ? plannerHourFormatter.format(date).replace(/\s+/g, '').toLowerCase()
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
  const [reopenAfterEdit, setReopenAfterEdit] = useState(false)
  const editingTask = useMemo(() => {
    if (!editingTaskId) return null
    return (
      dueTasks.find(task => task.id === editingTaskId) ??
      blocks.find(block => block.task_id === editingTaskId)?.task ??
      null
    )
  }, [blocks, dueTasks, editingTaskId])

  function openTask(taskId: string) {
    setEditingTaskId(taskId)
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
            if (reopenAfterEdit) {
              setReopenAfterEdit(false)
              setOpen(true)
            }
          }}
        />
      ) : null}
    </>
  )
}

function PlannerCalendar({
  onTaskOpen,
}: {
  onTaskOpen: (taskId: string) => void
}) {
  const {
    day,
    setOpen,
    blocks,
    dueTasks,
    events,
    lists,
    loading,
    error,
    reload,
    save,
    remove,
    complete,
    create,
    busy,
    preview,
  } = useAgenda()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const displayedBlocks = useMemo(() => {
    if (!preview) return blocks
    const previewBlock: AgendaBlock = {
      task_id: preview.task.id,
      user_id: preview.task.user_id,
      starts_at: new Date(preview.start).toISOString(),
      ends_at: new Date(preview.end).toISOString(),
      task: preview.task,
    }
    return [
      ...blocks.filter(block => block.task_id !== preview.task.id),
      previewBlock,
    ]
  }, [blocks, preview])
  const calendarItems = useMemo(
    () => projectCalendarItems(dueTasks, displayedBlocks, events),
    [displayedBlocks, dueTasks, events],
  )
  function schedule(task: TaskWithList, startsAt: Date, endsAt: Date | null) {
    return save(task, startsAt.getTime(), endsAt?.getTime() ?? null)
  }

  function quickCreate(input: QuickCreateInput) {
    return create(input)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="agenda-calendar-header shrink-0 border-b border-border-subtle p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold">Today</h2>
            <p className="truncate text-sm text-muted-foreground">
              {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
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
          openTaskMenuOnClick
          calendarItems={calendarItems}
          lists={lists}
          selectedTaskId={selectedTaskId}
          busyTaskIds={busy}
          onRangeLabelChange={ignoreLabel}
          onRangeChange={ignoreRange}
          onTaskSelect={setSelectedTaskId}
          onTaskOpen={onTaskOpen}
          onTaskSchedule={schedule}
          onTaskUnschedule={(task) => remove(task.id)}
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
