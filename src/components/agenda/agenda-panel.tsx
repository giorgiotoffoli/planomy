'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { dayBounds, layoutBlocks, MINUTE, PIXELS_PER_MINUTE, timeLabel, type Interval } from '@/lib/agenda'
import { projectCalendarItems, type CalendarItem } from '@/lib/calendar-items'
import { listColorStyle } from '@/lib/list-colors'
import { localDateKey } from '@/lib/today'
import type { AgendaBlock, CalendarEventWithList } from '@/types'
import { useAgenda } from './agenda-provider'
import AgendaTaskBlock from './agenda-task-block'
import CalendarItemContent from '@/components/calendar/calendar-item-content'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/task-edit-dialog'

const desktopQuery = '(min-width: 1280px)'
function subscribe(listener: () => void) {
  const query = window.matchMedia(desktopQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
function restoreFocus() { document.querySelector<HTMLButtonElement>('[data-agenda-toggle]')?.focus() }

export default function AgendaPanel() {
  const { open, setOpen } = useAgenda()
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(desktopQuery).matches, () => false)
  if (desktop) return open ? <aside id="daily-agenda" aria-label="Today calendar" className="agenda-calendar planomy-calendar flex h-full w-[352px] shrink-0 flex-col border-l"><Timeline /></aside> : null
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent id="daily-agenda" showCloseButton={false} className="agenda-calendar planomy-calendar w-[min(100vw,380px)] gap-0" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <SheetTitle className="sr-only">Today calendar</SheetTitle><SheetDescription className="sr-only">Today’s calendar with drag-and-drop task scheduling.</SheetDescription>
      <Timeline />
    </SheetContent>
  </Sheet>
}

function Slot({ instant, top, hour }: { instant: number; top: number; hour: boolean }) {
  const { setNodeRef } = useDroppable({ id: `agenda-slot:${instant}`, data: { kind: 'agenda-slot', instant } })
  return <div ref={setNodeRef} className={`agenda-calendar-slot absolute right-0 left-0 border-t ${hour ? 'border-border' : 'border-border/40'}`} style={{ top, height: 15 * PIXELS_PER_MINUTE }}>
    {hour && <span className="pointer-events-none absolute left-1 top-1 w-16 text-[11px] leading-tight text-muted-foreground">{timeLabel(instant)}</span>}
  </div>
}

type AgendaTimelineBlock =
  | (AgendaBlock & { kind: 'task' })
  | (Interval & { kind: 'event'; event: CalendarEventWithList })

function AgendaEventBlock({
  item,
  dayStart,
}: {
  item: { block: Extract<AgendaTimelineBlock, { kind: 'event' }>; start: number; end: number; column: number; columns: number }
  dayStart: number
}) {
  const { block } = item
  const height = (item.end - item.start) / MINUTE * PIXELS_PER_MINUTE
  const eventItem: CalendarItem = { id: `event:${block.event.id}`, kind: 'event', event: block.event }
  return (
    <div
      title={block.event.title}
      className="planomy-native-event pointer-events-auto absolute overflow-hidden"
      style={{
        ...listColorStyle(block.event.list?.color),
        top: (item.start - dayStart) / MINUTE * PIXELS_PER_MINUTE,
        height,
        left: `${item.column / item.columns * 100}%`,
        width: `calc(${100 / item.columns}% - 3px)`,
      }}
    >
      <CalendarItemContent item={eventItem} compact={false} />
    </div>
  )
}

function AgendaAllDayItem({ item }: { item: CalendarItem }) {
  const { lists, categories } = useAgenda()
  const content = (
    <div
      className={`agenda-calendar-all-day-item ${item.kind === 'due-task' ? 'planomy-due-event' : 'planomy-native-event'}`}
      style={listColorStyle(item.kind === 'event' ? item.event.list?.color : item.task.list?.color)}
      title={item.kind === 'event' ? item.event.title : item.task.title}
    >
      <CalendarItemContent item={item} compact={false} />
    </div>
  )

  return item.kind === 'due-task' ? (
    <TaskEditDialog
      task={item.task}
      lists={lists}
      categories={categories}
      currentListId={item.task.list_id}
    >
      {content}
    </TaskEditDialog>
  ) : content
}

function Timeline() {
  const { day, setOpen, blocks, dueTasks, events, loading, error, reload, preview } = useAgenda()
  const scroll = useRef<HTMLDivElement>(null)
  const initialized = useRef('')
  const [now, setNow] = useState(() => Date.now())
  const { start, end, minutes } = dayBounds(day)
  const calendarItems = useMemo(
    () => projectCalendarItems(dueTasks, blocks, events),
    [blocks, dueTasks, events],
  )
  const allDayItems = useMemo(
    () => calendarItems.filter((item) => item.kind === 'due-task' || (item.kind === 'event' && item.event.all_day)),
    [calendarItems],
  )
  const timelineBlocks = useMemo<AgendaTimelineBlock[]>(
    () => [
      ...blocks.map((block) => ({ ...block, kind: 'task' as const })),
      ...events.flatMap((event) => {
        if (event.all_day || !event.starts_at || !event.ends_at) return []
        return [{
          task_id: `event:${event.id}`,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          kind: 'event' as const,
          event,
        }]
      }),
    ],
    [blocks, events],
  )
  const layout = useMemo(() => layoutBlocks(timelineBlocks, day), [day, timelineBlocks])
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    if (loading || error || initialized.current === day || !scroll.current) return
    const anchor = localDateKey() === day ? Date.now() : layout[0]?.start ?? start + 9 * 60 * MINUTE
    scroll.current.scrollTop = Math.max(0, ((anchor - start) / MINUTE - 60) * PIXELS_PER_MINUTE)
    initialized.current = day
  }, [day, loading, error, layout, start])
  const slots = Array.from({ length: Math.ceil(minutes / 15) }, (_, index) => start + index * 15 * MINUTE)
  return <>
    <div className="agenda-calendar-header shrink-0 space-y-2 border-b border-border-subtle p-3">
      <div className="flex items-center justify-between"><div><h2 className="font-heading text-base font-semibold">Today</h2><p className="text-sm text-muted-foreground">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p></div><Button size="icon" variant="ghost" aria-label="Close Today calendar" onClick={() => { setOpen(false); restoreFocus() }}><X /></Button></div>
      <p className="text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · Drag tasks into a time</p>
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading Today…</p>}
      {error && <div role="alert" className="text-sm text-destructive">{error}<Button size="sm" variant="outline" onClick={() => void reload()}>Retry</Button></div>}
      {!loading && !error && calendarItems.length === 0 && <p className="text-xs text-muted-foreground">Drag a task here, or open Edit on a task to add Plan time.</p>}
    </div>
    {allDayItems.length > 0 && <div className="agenda-calendar-all-day border-b border-border-subtle px-2 py-2"><span className="agenda-calendar-lane-label">All day</span><div className="min-w-0 space-y-1">{allDayItems.map((item) => <AgendaAllDayItem key={item.id} item={item} />)}</div></div>}
    <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Today calendar timeline">
      <div className="relative mr-2" style={{ height: minutes * PIXELS_PER_MINUTE }}>
        {slots.map((instant, index) => <Slot key={instant} instant={instant} top={index * 15 * PIXELS_PER_MINUTE} hour={new Date(instant).getMinutes() === 0} />)}
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[72px]">
          {layout.map(item => {
            if (item.block.kind === 'task') {
              return <AgendaTaskBlock key={item.block.task_id} item={{ ...item, block: item.block }} dayStart={start} />
            }
            return <AgendaEventBlock key={item.block.task_id} item={{ ...item, block: item.block as Extract<AgendaTimelineBlock, { kind: 'event' }> }} dayStart={start} />
          })}
          {preview && preview.end > start && preview.start < end && <div className="absolute right-0 left-0 z-20 rounded-md border-2 border-solid border-blue-500 bg-blue-500/15 p-1 text-xs text-blue-700 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200" style={{ top: (Math.max(start, preview.start) - start) / MINUTE * PIXELS_PER_MINUTE, height: (Math.min(end, preview.end) - Math.max(start, preview.start)) / MINUTE * PIXELS_PER_MINUTE }}>{timeLabel(preview.start)}</div>}
          {now >= start && now < end && <div className="agenda-now-indicator absolute right-0 -left-1 z-30 border-t-2 border-primary" style={{ top: (now - start) / MINUTE * PIXELS_PER_MINUTE }}><span className="absolute -top-1.5 left-0 size-2 rounded-full bg-primary" /><span className="sr-only">Current time {timeLabel(now)}</span></div>}
        </div>
      </div>
    </div>
  </>
}
