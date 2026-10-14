'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString } from '@/lib/crypto/e2ee'
import { dayBounds, dragIntent, MINUTE, shiftDay, snapInstant, timeLabel } from '@/lib/agenda'
import { localDateKey } from '@/lib/today'
import type { AgendaBlock, CalendarEventWithList, Category, List, TaskWithList, TimeBlock } from '@/types'
import { getCalendarRangeData } from '@/components/calendar/actions'
import { removeTimeBlock, saveTimeBlock } from './actions'
import { TASKS_CHANGED } from '@/components/tasks/mutations'
import AgendaPanel from './agenda-panel'

export type AgendaDrag = {
  kind: 'task' | 'agenda-block' | 'agenda-resize'
  task: TaskWithList
  block?: TimeBlock
  scope?: string
  reorder?: (active: string, over: string) => void
}

async function decryptTask(task: TaskWithList, masterKey: Uint8Array) {
  return {
    ...task,
    title: await decryptString(task.title, masterKey),
    notes: task.notes ? await decryptString(task.notes, masterKey) : task.notes,
    list: task.list
      ? {
          ...task.list,
          title: await decryptString(task.list.title, masterKey),
          emoji: task.list.emoji
            ? await decryptString(task.list.emoji, masterKey)
            : task.list.emoji,
        }
      : null,
  }
}

async function decryptBlocks(blocks: AgendaBlock[], masterKey: Uint8Array) {
  return Promise.all(
    blocks
      .filter((block) => block.task)
      .map(async (block) => ({
        ...block,
        task: await decryptTask(block.task, masterKey),
      })),
  )
}

async function decryptEvents(
  events: CalendarEventWithList[],
  masterKey: Uint8Array,
) {
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      title: await decryptString(event.title, masterKey),
      list: event.list
        ? {
            ...event.list,
            title: await decryptString(event.list.title, masterKey),
            emoji: event.list.emoji
              ? await decryptString(event.list.emoji, masterKey)
              : event.list.emoji,
          }
        : null,
    })),
  )
}

type AgendaContextValue = {
  open: boolean; setOpen: (open: boolean) => void
  day: string; setDay: (day: string) => void
  blocks: AgendaBlock[]; dueTasks: TaskWithList[]; events: CalendarEventWithList[]
  lists: List[]; loading: boolean; error: string | null
  reload: () => Promise<void>
  save: (task: TaskWithList, start: number, end: number | null) => Promise<boolean>
  remove: (taskId: string) => Promise<boolean>
  categories: Category[]
  busy: Set<string>
  preview: {
    task: TaskWithList
    start: number
    end: number
    persistedEnd: number | null
  } | null
}
const AgendaContext = createContext<AgendaContextValue | null>(null)
export function useAgenda() {
  const value = useContext(AgendaContext)
  if (!value) throw new Error('AgendaProvider is required')
  return value
}

export default function AgendaProvider({ children }: { children: ReactNode }) {
  const { masterKey } = useE2EE()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpenState] = useState(false)
  const [day, setDay] = useState(() => localDateKey())
  const [loaded, setLoaded] = useState<{
    day: string
    blocks: AgendaBlock[]
    dueTasks: TaskWithList[]
    events: CalendarEventWithList[]
    lists: List[]
    categories: Category[]
  }>({ day: '', blocks: [], dueTasks: [], events: [], lists: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(new Set<string>())
  const pending = useRef(new Set<string>())
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const [drag, setDrag] = useState<AgendaDrag | null>(null)
  const [preview, setPreview] = useState<AgendaContextValue['preview']>(null)
  const isCalendarPage = pathname === '/calendar'
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }), useSensor(KeyboardSensor))

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    if (value) setDay(localDateKey())
    try { localStorage.setItem('planomy:agenda:open', String(value)) } catch { /* Private browsing may disable storage. */ }
  }, [])

  useEffect(() => {
    const syncToday = () => setDay((current) => {
      const today = localDateKey()
      return current === today ? current : today
    })
    syncToday()
    const interval = window.setInterval(syncToday, 60_000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { setOpenState(localStorage.getItem('planomy:agenda:open') === 'true') } catch { /* Use collapsed default. */ }
    }, 0)
    return () => clearTimeout(timeout)
  }, [])

  const reload = useCallback(async () => {
    if (!masterKey) return
    const request = ++generation.current
    const { start, end } = dayBounds(day)
    setLoading(true)
    try {
      const result = await getCalendarRangeData({
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
        startsOn: day,
        endsOn: shiftDay(day, 1),
      })
      const [blocks, dueTasks, events, lists, categories] = await Promise.all([
        decryptBlocks(result.scheduledTasks, masterKey),
        Promise.all(result.dueTasks.map((task) => decryptTask(task, masterKey))),
        decryptEvents(result.events, masterKey),
        Promise.all(result.lists.map(async (list) => ({
          ...list,
          title: await decryptString(list.title, masterKey),
          emoji: list.emoji
            ? await decryptString(list.emoji, masterKey)
            : list.emoji,
        }))),
        Promise.all(result.categories.map(async category => ({
          ...category,
          title: await decryptString(category.title, masterKey),
        }))),
      ])
      if (request === generation.current) {
        setLoaded(current => ({ day, lists, blocks: current.day === day
          ? [...blocks.filter(block => !pending.current.has(block.task_id)), ...current.blocks.filter(block => pending.current.has(block.task_id))]
          : blocks, dueTasks, events, categories }))
        setError(null)
      }
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Agenda could not be loaded.')
    } finally { if (request === generation.current) setLoading(false) }
  }, [day, masterKey])
  const latestReload = useRef(reload)
  useEffect(() => { latestReload.current = reload }, [reload])

  useEffect(() => {
    const timeout = setTimeout(() => { if (open && !isCalendarPage) void reload() }, 0)
    return () => { clearTimeout(timeout); invalidate() }
  }, [open, isCalendarPage, reload, invalidate])
  useEffect(() => {
    const changed = () => { router.refresh(); if (open && !isCalendarPage) void reload() }
    window.addEventListener(TASKS_CHANGED, changed)
    return () => window.removeEventListener(TASKS_CHANGED, changed)
  }, [open, isCalendarPage, reload, router])

  async function mutate(taskId: string, operation: () => Promise<unknown>, optimistic: (blocks: AgendaBlock[]) => AgendaBlock[]) {
    if (pending.current.has(taskId)) return false
    pending.current.add(taskId); setBusy(new Set(pending.current)); generation.current++
    const previous = loaded.blocks.find(block => block.task_id === taskId)
    setLoaded(current => ({ ...current, blocks: optimistic(current.blocks) }))
    try {
      await operation()
      return true
    } catch (cause) {
      setLoaded(current => ({ ...current, blocks: [...current.blocks.filter(block => block.task_id !== taskId), ...(previous && current.day === loaded.day ? [previous] : [])] }))
      toast.error(cause instanceof Error ? cause.message : 'Schedule was not saved.')
      return false
    } finally {
      pending.current.delete(taskId); setBusy(new Set(pending.current))
      await latestReload.current()
    }
  }
  async function save(task: TaskWithList, start: number, end: number | null) {
    if (
      !Number.isFinite(start) ||
      (end !== null && (!Number.isFinite(end) || end - start < 15 * MINUTE))
    ) {
      toast.error('Choose valid times at least 15 minutes apart.')
      return false
    }
    const starts_at = new Date(start).toISOString()
    const ends_at = end === null ? null : new Date(end).toISOString()
    return mutate(task.id, () => saveTimeBlock(task.id, starts_at, ends_at), blocks => [...blocks.filter(block => block.task_id !== task.id), { task_id: task.id, user_id: task.user_id, starts_at, ends_at, task }])
  }
  async function remove(taskId: string) {
    return mutate(taskId, () => removeTimeBlock(taskId), blocks => blocks.filter(block => block.task_id !== taskId))
  }
  function proposal(event: DragOverEvent | DragEndEvent) {
    const source = event.active.data.current as AgendaDrag | undefined
    const target = event.over?.data.current
    if (!source || dragIntent(source, target) !== 'schedule') return null
    const instant = snapInstant(day, (Number(target!.instant) - dayBounds(day).start) / MINUTE)
    if (source.kind === 'agenda-resize' && source.block) {
      const start = Date.parse(source.block.starts_at)
      const end = Math.max(start + 15 * MINUTE, instant + 15 * MINUTE)
      return { task: source.task, start, end, persistedEnd: end }
    }
    const persistedDuration = source.block?.ends_at
      ? Date.parse(source.block.ends_at) - Date.parse(source.block.starts_at)
      : null
    const displayDuration = persistedDuration ?? 30 * MINUTE
    return {
      task: source.task,
      start: instant,
      end: instant + displayDuration,
      persistedEnd: persistedDuration === null ? null : instant + persistedDuration,
    }
  }
  function finishDrag(event: DragEndEvent) {
    const next = proposal(event)
    const source = event.active.data.current as AgendaDrag | undefined
    if (next) void save(next.task, next.start, next.persistedEnd)
    else if (source && dragIntent(source, event.over?.data.current) === 'reorder' && event.over) source.reorder?.(source.task.id, String(event.over.id))
    setDrag(null); setPreview(null)
  }

  return <AgendaContext.Provider value={{ open: !isCalendarPage && open, setOpen, day, setDay, blocks: loaded.day === day ? loaded.blocks : [], dueTasks: loaded.day === day ? loaded.dueTasks : [], events: loaded.day === day ? loaded.events : [], lists: loaded.lists, categories: loaded.categories, loading: loading || (loaded.day !== day && !error), error, reload, save, remove, busy, preview }}>
    <DndContext sensors={sensors} collisionDetection={args => {
      // Pointer drags must actually enter a target; keyboard drags use nearest target.
      const candidates = args.droppableContainers.filter(container => dragIntent(args.active.data.current ?? {}, container.data.current) !== 'none')
      return args.pointerCoordinates ? pointerWithin({ ...args, droppableContainers: candidates }) : closestCenter({ ...args, droppableContainers: candidates })
    }} onDragStart={event => setDrag(event.active.data.current as AgendaDrag)} onDragOver={event => setPreview(proposal(event))} onDragEnd={finishDrag} onDragCancel={() => { setDrag(null); setPreview(null) }}>
      <div className="flex h-dvh min-w-0 overflow-hidden">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background selection:bg-primary selection:text-primary-foreground">{children}</main>
        <AgendaPanel />
      </div>
      <DragOverlay dropAnimation={null}>{drag && <div className="max-w-60 rounded-lg border bg-background p-3 text-sm shadow-lg"><p className="truncate font-medium">{drag.task.title}</p>{preview && <p className="text-xs text-muted-foreground">{timeLabel(preview.start)}{preview.persistedEnd === null ? ' · no duration' : ` – ${timeLabel(preview.end)}`}</p>}</div>}</DragOverlay>
    </DndContext>
  </AgendaContext.Provider>
}
