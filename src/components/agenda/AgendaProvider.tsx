'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString } from '@/lib/crypto/e2ee'
import { dayBounds, dragIntent, MINUTE, snapInstant, timeLabel } from '@/lib/agenda'
import { localDateKey } from '@/lib/my-day'
import type { AgendaBlock, List, TaskWithList, TimeBlock } from '@/types'
import { getAgendaData, removeTimeBlock, saveTimeBlock } from './actions'
import { TASKS_CHANGED } from '@/components/tasks/mutations'
import AgendaPanel from './AgendaPanel'
import ScheduleDialog from './ScheduleDialog'

export type AgendaDrag = {
  kind: 'task' | 'agenda-block' | 'agenda-resize'
  task: TaskWithList
  block?: TimeBlock
  scope?: string
  reorder?: (active: string, over: string) => void
}
type AgendaContextValue = {
  open: boolean; setOpen: (open: boolean) => void
  day: string; setDay: (day: string) => void
  blocks: AgendaBlock[]; lists: List[]; loading: boolean; error: string | null
  reload: () => Promise<void>
  save: (task: TaskWithList, start: number, end: number) => Promise<boolean>
  remove: (taskId: string) => Promise<boolean>
  edit: (task: TaskWithList) => void
  busy: Set<string>
  preview: { task: TaskWithList; start: number; end: number } | null
}
const AgendaContext = createContext<AgendaContextValue | null>(null)
export function useAgenda() {
  const value = useContext(AgendaContext)
  if (!value) throw new Error('AgendaProvider is required')
  return value
}

export default function AgendaProvider({ children }: { children: ReactNode }) {
  const { masterKey } = useE2EE()
  const router = useRouter()
  const [open, setOpenState] = useState(false)
  const [day, setDay] = useState(() => localDateKey())
  const [loaded, setLoaded] = useState<{ day: string; blocks: AgendaBlock[]; lists: List[] }>({ day: '', blocks: [], lists: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TaskWithList | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [busy, setBusy] = useState(new Set<string>())
  const pending = useRef(new Set<string>())
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const [drag, setDrag] = useState<AgendaDrag | null>(null)
  const [preview, setPreview] = useState<AgendaContextValue['preview']>(null)
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }), useSensor(KeyboardSensor))

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    try { localStorage.setItem('planomy:agenda:open', String(value)) } catch { /* Private browsing may disable storage. */ }
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
      const result = await getAgendaData(new Date(start).toISOString(), new Date(end).toISOString())
      const blocks = await Promise.all(result.blocks.filter(block => block.task).map(async block => ({ ...block, task: {
        ...block.task,
        title: await decryptString(block.task.title, masterKey),
        notes: block.task.notes ? await decryptString(block.task.notes, masterKey) : block.task.notes,
        list: block.task.list ? { ...block.task.list, title: await decryptString(block.task.list.title, masterKey) } : null,
      } })))
      const lists = await Promise.all(result.lists.map(async list => ({ ...list, title: await decryptString(list.title, masterKey) })))
      if (request === generation.current) {
        setLoaded(current => ({ day, lists, blocks: current.day === day
          ? [...blocks.filter(block => !pending.current.has(block.task_id)), ...current.blocks.filter(block => pending.current.has(block.task_id))]
          : blocks }))
        setError(null)
      }
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Agenda could not be loaded.')
    } finally { if (request === generation.current) setLoading(false) }
  }, [day, masterKey])
  const latestReload = useRef(reload)
  useEffect(() => { latestReload.current = reload }, [reload])

  useEffect(() => {
    const timeout = setTimeout(() => { if (open) void reload() }, 0)
    return () => { clearTimeout(timeout); invalidate() }
  }, [open, reload, invalidate])
  useEffect(() => {
    const changed = () => { router.refresh(); if (open) void reload() }
    window.addEventListener(TASKS_CHANGED, changed)
    return () => window.removeEventListener(TASKS_CHANGED, changed)
  }, [open, reload, router])

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
  async function save(task: TaskWithList, start: number, end: number) {
    if (!Number.isFinite(new Date(start).getTime()) || !Number.isFinite(new Date(end).getTime()) || end - start < 15 * MINUTE) {
      toast.error('Choose valid times at least 15 minutes apart.')
      return false
    }
    const starts_at = new Date(start).toISOString(), ends_at = new Date(end).toISOString()
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
      return { task: source.task, start, end: Math.max(start + 15 * MINUTE, instant + 15 * MINUTE) }
    }
    const duration = source.block ? Date.parse(source.block.ends_at) - Date.parse(source.block.starts_at) : 30 * MINUTE
    return { task: source.task, start: instant, end: instant + duration }
  }
  function finishDrag(event: DragEndEvent) {
    const next = proposal(event)
    const source = event.active.data.current as AgendaDrag | undefined
    if (next) void save(next.task, next.start, next.end)
    else if (source && dragIntent(source, event.over?.data.current) === 'reorder' && event.over) source.reorder?.(source.task.id, String(event.over.id))
    setDrag(null); setPreview(null)
  }

  function edit(task: TaskWithList) {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setEditing(task)
  }
  return <AgendaContext.Provider value={{ open, setOpen, day, setDay, blocks: loaded.day === day ? loaded.blocks : [], lists: loaded.lists, loading: loading || (loaded.day !== day && !error), error, reload, save, remove, edit, busy, preview }}>
    <DndContext sensors={sensors} collisionDetection={args => {
      // Pointer drags must actually enter a target; keyboard drags use nearest target.
      const candidates = args.droppableContainers.filter(container => dragIntent(args.active.data.current ?? {}, container.data.current) !== 'none')
      return args.pointerCoordinates ? pointerWithin({ ...args, droppableContainers: candidates }) : closestCenter({ ...args, droppableContainers: candidates })
    }} onDragStart={event => setDrag(event.active.data.current as AgendaDrag)} onDragOver={event => setPreview(proposal(event))} onDragEnd={finishDrag} onDragCancel={() => { setDrag(null); setPreview(null) }}>
      <div className="flex h-dvh min-w-0 overflow-hidden">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 selection:bg-blue-500 selection:text-white">{children}</main>
        <AgendaPanel />
      </div>
      <DragOverlay dropAnimation={null}>{drag && <div className="max-w-60 rounded-lg border bg-background p-3 text-sm shadow-lg"><p className="truncate font-medium">{drag.task.title}</p>{preview && <p className="text-xs text-muted-foreground">{timeLabel(preview.start)} – {timeLabel(preview.end)}</p>}</div>}</DragOverlay>
    </DndContext>
    {editing && <ScheduleDialog key={editing.id} task={editing} onClose={() => setEditing(null)} restoreFocus={() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus()
      document.querySelector<HTMLButtonElement>('[data-agenda-toggle]')?.focus()
    }} />}
  </AgendaContext.Provider>
}
