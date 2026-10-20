'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { dayBounds, dragIntent, MINUTE, shiftDay, SLOT_MINUTES, snapInstant, timeLabel } from '@/lib/agenda'
import {
  isSingleDayTimedRange,
  TASK_DRAG_DISTANCE,
  TASK_TOUCH_DELAY,
  TASK_TOUCH_TOLERANCE,
  taskDisplayEnd,
} from '@/lib/calendar-interactions'
import { localDateKey } from '@/lib/today'
import { applyTaskOrganizationChange } from '@/lib/tasks'
import type { AgendaBlock, CalendarEventWithList, Category, List, NeedsAttentionItem, TaskWithList, TimeBlock } from '@/types'
import { getCalendarBaseData, getRecurringCalendarData } from '@/components/calendar/actions'
import { getNeedsAttention } from '@/components/home/queries'
import type { QuickCreateInput } from '@/components/calendar/calendar-quick-create'
import {
  createTask as createTaskAction,
  deleteTask as deleteTaskAction,
  updateTaskCompleted as updateTaskCompletedAction,
} from '@/components/tasks/actions'
import { updateTaskOccurrenceCompleted } from '@/components/tasks/recurrence-actions'
import { removeTimeBlock, restoreTimeBlock, saveTimeBlock, skipTimeBlock } from './actions'
import {
  TASK_ORGANIZATION_CHANGED,
  TASKS_CHANGED,
  notifyTasksChanged,
  taskVisualMutationFromEvent,
  taskOrganizationChangeFromEvent,
} from '@/components/tasks/mutations'
import { PLAN_TIME_CHANGED, notifyPlanTimeChanged, planTimeChangeOrigin } from './mutations'
import AgendaPanel from './agenda-panel'
import { isCreatedScheduleVisible } from '@/lib/task-creation'
import { showTaskCreatedToast } from '@/components/tasks/create-task/task-created-toast'
import {
  EVENTS_CHANGED,
  eventVisualMutationFromEvent,
} from '@/components/events/mutations'
import { LISTS_CHANGED, listMutationFromEvent } from '@/components/lists/mutations'
import { CATEGORIES_CHANGED, categoryVisualMutationFromEvent } from '@/components/categories/mutations'
import {
  applyCategoryMutationToEvent,
  applyCategoryMutationToTask,
  applyCategoryMutationToCategory,
  applyEventVisualMutation,
  applyListMutationToEvent,
  applyListMutationToList,
  applyListMutationToTask,
  applyTaskVisualMutation,
  eventMutationAppliesToScheduledTask,
} from '@/lib/live-mutations'
import { useCalendarPreferences } from '@/components/settings/calendar-preferences-provider'
import { applyTaskOccurrenceOverride } from '@/lib/task-occurrence-overrides'

function blockKey(block: Pick<AgendaBlock, 'id' | 'task_id' | 'starts_at'>) {
  return block.id ?? `${block.task_id}:${block.starts_at}`
}

export type AgendaDrag = {
  kind: 'task' | 'agenda-block' | 'agenda-resize'
  task: TaskWithList
  block?: TimeBlock
  scope?: string
  reorder?: (active: string, over: string) => void
  changeCategory?: (taskId: string, categoryId: string | null) => Promise<void>
  categoryId?: string | null
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

async function decryptBlocks(blocks: AgendaBlock[], masterKey: Uint8Array, lists: List[], categories: Category[]) {
  return Promise.all(
    blocks
      .filter((block) => block.task)
      .map(async (block) => ({
        ...block,
        task: await applyTaskOccurrenceOverride(
          await decryptTask(block.task, masterKey),
          block.occurrence,
          masterKey,
          lists,
          categories,
        ),
      })),
  )
}

async function decryptAttention(
  items: NeedsAttentionItem[],
  masterKey: Uint8Array,
) {
  return Promise.all(items.map(async (item) => ({
    ...item,
    task: await decryptTask(item.task, masterKey),
  })))
}

async function decryptEvents(
  events: CalendarEventWithList[],
  masterKey: Uint8Array,
) {
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      title: await decryptString(event.title, masterKey),
      description: event.description
        ? await decryptString(event.description, masterKey)
        : event.description,
      location: event.location
        ? await decryptString(event.location, masterKey)
        : event.location,
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
  attention: NeedsAttentionItem[]
  lists: List[]; loading: boolean; error: string | null
  reload: () => Promise<void>
  save: (task: TaskWithList, start: number, end: number | null, sessionId?: string) => Promise<boolean>
  remove: (taskId: string, sessionId: string) => Promise<boolean>
  removeTask: (taskId: string) => Promise<boolean>
  skip: (taskId: string, sessionId: string, skipped: boolean) => Promise<boolean>
  complete: (task: TaskWithList, occurrenceId?: string | null) => Promise<boolean>
  create: (input: QuickCreateInput) => Promise<boolean>
  categories: Category[]
  busy: Set<string>
  preview: {
    task: TaskWithList
    start: number
    end: number
    persistedEnd: number | null
    sessionId?: string
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
  const { preferences: calendarPreferences } = useCalendarPreferences()
  const router = useRouter()
  const pathname = usePathname()
  const plannerAvailable =
    pathname !== '/calendar' && !pathname.startsWith('/calendar/')
  const [open, setOpenState] = useState(false)
  const [day, setDay] = useState(() => localDateKey())
  const systemDayRef = useRef(localDateKey())
  const [loaded, setLoaded] = useState<{
    day: string
    blocks: AgendaBlock[]
    dueTasks: TaskWithList[]
    events: CalendarEventWithList[]
    lists: List[]
    categories: Category[]
    attention: NeedsAttentionItem[]
  }>({ day: '', blocks: [], dueTasks: [], events: [], lists: [], categories: [], attention: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(new Set<string>())
  const pending = useRef(new Set<string>())
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const [drag, setDrag] = useState<AgendaDrag | null>(null)
  const [preview, setPreview] = useState<AgendaContextValue['preview']>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: TASK_DRAG_DISTANCE },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TASK_TOUCH_DELAY,
        tolerance: TASK_TOUCH_TOLERANCE,
      },
    }),
    useSensor(KeyboardSensor),
  )

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    if (value) {
      const today = localDateKey()
      systemDayRef.current = today
      setDay(today)
    }
    try { localStorage.setItem('planomy:agenda:open', String(value)) } catch { /* Private browsing may disable storage. */ }
  }, [])

  useEffect(() => {
    const syncToday = () => setDay((current) => {
      const today = localDateKey()
      const previousSystemDay = systemDayRef.current
      systemDayRef.current = today
      return current === previousSystemDay ? today : current
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

    const range = {
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      startsOn: day,
      endsOn: shiftDay(day, 1),
    }

    try {
      const result = await getCalendarBaseData(range)
      const decryptedLists = await Promise.all(result.lists.map(async (list) => ({
        ...list,
        title: await decryptString(list.title, masterKey),
        emoji: list.emoji
          ? await decryptString(list.emoji, masterKey)
          : list.emoji,
      })))
      const [blocks, dueTasks, events, categories] = await Promise.all([
        decryptBlocks(result.scheduledTasks, masterKey, decryptedLists, result.categories),
        Promise.all(result.dueTasks.map((task) => decryptTask(task, masterKey))),
        decryptEvents(result.events, masterKey),
        Promise.all(result.categories.map(async category => ({
          ...category,
          title: await decryptString(category.title, masterKey),
        }))),
      ])
      if (request === generation.current) {
        setLoaded(current => ({ day, lists: decryptedLists, blocks: current.day === day
          ? [...blocks.filter(block => !pending.current.has(block.task_id)), ...current.blocks.filter(block => pending.current.has(block.task_id))]
          : blocks, dueTasks, events, categories, attention: current.day === day ? current.attention : [] }))
        setError(null)
        setLoading(false)
      }

      void getNeedsAttention({ today: day, now: new Date().toISOString() })
        .then((items) => decryptAttention(items, masterKey))
        .then((attention) => {
          if (request === generation.current) {
            setLoaded((current) => ({ ...current, attention }))
          }
        })
        .catch((cause) => {
          if (request === generation.current) {
            setError(cause instanceof Error ? cause.message : 'Agenda attention items could not be loaded.')
          }
        })

      // Recurrence expansion can involve several database writes. Keep it off
      // the critical paint path and replace the schedule once it is ready.
      void getRecurringCalendarData(range)
        .then(async (recurring) => {
          const recurringBlocks = await decryptBlocks(recurring.scheduledTasks, masterKey, decryptedLists, categories)
          if (request === generation.current) {
            setLoaded((current) => ({
              ...current,
              blocks: current.day === day
                ? [
                    ...recurringBlocks.filter(block => !pending.current.has(block.task_id)),
                    ...current.blocks.filter(block => pending.current.has(block.task_id)),
                  ]
                : recurringBlocks,
            }))
          }
        })
        .catch((cause) => {
          if (request === generation.current) {
            setError(cause instanceof Error ? cause.message : 'Recurring agenda tasks could not be loaded.')
          }
        })
    } catch (cause) {
      if (request === generation.current) {
        setError(cause instanceof Error ? cause.message : 'Agenda could not be loaded.')
        setLoading(false)
      }
    }
  }, [day, masterKey])
  const latestReload = useRef(reload)
  useEffect(() => { latestReload.current = reload }, [reload])

  useEffect(() => {
    const timeout = setTimeout(() => { if (open && plannerAvailable) void reload() }, 0)
    return () => { clearTimeout(timeout); invalidate() }
  }, [open, plannerAvailable, reload, invalidate])
  useEffect(() => {
    const changed = () => { router.refresh(); if (open && plannerAvailable) void reload() }
    const tasksChanged = (event: Event) => {
      const change = taskVisualMutationFromEvent(event)
      if (!change) {
        changed()
        return
      }
      setLoaded((current) => ({
        ...current,
        dueTasks: current.dueTasks.map((task) =>
          change.occurrenceId ? task : applyTaskVisualMutation(task, change, current.lists),
        ),
        blocks: current.blocks.map((block) =>
          eventMutationAppliesToScheduledTask(block.occurrence_id, change)
            ? { ...block, task: applyTaskVisualMutation(block.task, change, current.lists) }
            : block,
        ),
        attention: current.attention.map((item) => ({
          ...item,
          task: change.occurrenceId
            ? item.task
            : applyTaskVisualMutation(item.task, change, current.lists),
        })),
      }))
      if (!change.phase) changed()
    }
    const eventsChanged = (event: Event) => {
      const change = eventVisualMutationFromEvent(event)
      if (!change) {
        changed()
        return
      }
      setLoaded((current) => ({
        ...current,
        events: current.events.map((item) =>
          applyEventVisualMutation(item, change, current.lists),
        ),
      }))
      if (!change.phase) changed()
    }
    const listsChanged = (event: Event) => {
      const change = listMutationFromEvent(event)
      if (!change) {
        changed()
        return
      }
      setLoaded((current) => ({
        ...current,
        lists: current.lists.map((list) => applyListMutationToList(list, change)),
        dueTasks: current.dueTasks.map((task) => applyListMutationToTask(task, change)),
        blocks: current.blocks.map((block) => ({
          ...block,
          task: applyListMutationToTask(block.task, change),
        })),
        events: current.events.map((item) => applyListMutationToEvent(item, change)),
        attention: current.attention.map((item) => ({
          ...item,
          task: applyListMutationToTask(item.task, change),
        })),
      }))
      if (!change.phase) changed()
    }
    const categoriesChanged = (event: Event) => {
      const change = categoryVisualMutationFromEvent(event)
      if (!change) {
        changed()
        return
      }
      setLoaded((current) => ({
        ...current,
        categories: current.categories.map((category) => applyCategoryMutationToCategory(category, change)),
        dueTasks: current.dueTasks.map((task) => applyCategoryMutationToTask(task, change)),
        blocks: current.blocks.map((block) => ({ ...block, task: applyCategoryMutationToTask(block.task, change) })),
        events: current.events.map((item) => applyCategoryMutationToEvent(item, change)),
        attention: current.attention.map((item) => ({ ...item, task: applyCategoryMutationToTask(item.task, change) })),
      }))
      if (!change.phase) changed()
    }
    const organizationChanged = (event: Event) => {
      const change = taskOrganizationChangeFromEvent(event)
      if (!change) return

      generation.current++
      setLoading(false)
      setLoaded((current) => ({
        ...current,
        dueTasks: current.dueTasks.map((task) =>
          applyTaskOrganizationChange(task, current.lists, change),
        ),
        blocks: current.blocks.map((block) => ({
          ...block,
          task: applyTaskOrganizationChange(
            block.task,
            current.lists,
            change,
          ),
        })),
      }))
    }
    const planTimeChanged = (event: Event) => {
      if (open && plannerAvailable && planTimeChangeOrigin(event) !== 'agenda') void reload()
    }
    window.addEventListener(TASKS_CHANGED, tasksChanged)
    window.addEventListener(EVENTS_CHANGED, eventsChanged)
    window.addEventListener(LISTS_CHANGED, listsChanged)
    window.addEventListener(CATEGORIES_CHANGED, categoriesChanged)
    window.addEventListener(TASK_ORGANIZATION_CHANGED, organizationChanged)
    window.addEventListener(PLAN_TIME_CHANGED, planTimeChanged)
    return () => {
      window.removeEventListener(TASKS_CHANGED, tasksChanged)
      window.removeEventListener(EVENTS_CHANGED, eventsChanged)
      window.removeEventListener(LISTS_CHANGED, listsChanged)
      window.removeEventListener(CATEGORIES_CHANGED, categoriesChanged)
      window.removeEventListener(
        TASK_ORGANIZATION_CHANGED,
        organizationChanged,
      )
      window.removeEventListener(PLAN_TIME_CHANGED, planTimeChanged)
    }
  }, [open, plannerAvailable, reload, router])

  const setTaskBusy = useCallback((taskId: string, isBusy: boolean) => {
    if (isBusy) pending.current.add(taskId)
    else pending.current.delete(taskId)
    setBusy(new Set(pending.current))
  }, [])

  async function save(task: TaskWithList, start: number, end: number | null, sessionId?: string) {
    const normalizedEnd = end ?? start + SLOT_MINUTES * MINUTE
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(normalizedEnd) ||
      normalizedEnd - start < SLOT_MINUTES * MINUTE
    ) {
      toast.error('Choose valid times at least 15 minutes apart.')
      return false
    }
    const starts_at = new Date(start).toISOString()
    const ends_at = new Date(normalizedEnd).toISOString()
    if (pending.current.has(task.id)) return false
    const optimisticId = sessionId ?? `pending:${crypto.randomUUID()}`
    const previous = sessionId ? loaded.blocks.find(block => blockKey(block) === sessionId) ?? null : null
    const optimistic: AgendaBlock = {
      id: optimisticId,
      task_id: task.id,
      user_id: task.user_id,
      starts_at,
      ends_at,
      status: 'scheduled',
      task,
    }
    pending.current.add(task.id)
    setBusy(new Set(pending.current))
    generation.current++
    setLoaded(current => ({
      ...current,
      blocks: [
        ...current.blocks.filter(block => blockKey(block) !== optimisticId),
        optimistic,
      ],
    }))
    try {
      const saved = await saveTimeBlock(task.id, starts_at, ends_at, sessionId)
      const persisted = { ...optimistic, id: saved.id, status: saved.status }
      setLoaded(current => ({
        ...current,
        blocks: [
          ...current.blocks.filter(block => blockKey(block) !== optimisticId),
          persisted,
        ],
      }))
      notifyPlanTimeChanged('agenda')
      return true
    } catch (cause) {
      setLoaded(current => ({
        ...current,
        blocks: [
          ...current.blocks.filter(block => blockKey(block) !== optimisticId),
          ...(previous && current.day === loaded.day ? [previous] : []),
        ],
      }))
      toast.error(cause instanceof Error ? cause.message : 'Schedule was not saved.')
      return false
    } finally {
      pending.current.delete(task.id)
      setBusy(new Set(pending.current))
      await latestReload.current()
    }
  }
  async function remove(taskId: string, sessionId: string) {
    if (pending.current.has(taskId)) return false
    const previous = loaded.blocks.find(block => blockKey(block) === sessionId) ?? null
    if (!previous) return true
    pending.current.add(taskId)
    setBusy(new Set(pending.current))
    generation.current++
    setLoaded(current => ({ ...current, blocks: current.blocks.filter(block => blockKey(block) !== sessionId) }))
    try {
      await removeTimeBlock(sessionId)
      notifyPlanTimeChanged('agenda')
      return true
    } catch (cause) {
      setLoaded(current => ({ ...current, blocks: [...current.blocks.filter(block => blockKey(block) !== sessionId), previous] }))
      toast.error(cause instanceof Error ? cause.message : 'Schedule was not removed.')
      return false
    } finally {
      pending.current.delete(taskId)
      setBusy(new Set(pending.current))
      await latestReload.current()
    }
  }
  async function removeTask(taskId: string) {
    if (pending.current.has(taskId)) return false

    const previousBlocks = loaded.blocks
    const previousDueTasks = loaded.dueTasks
    const previousAttention = loaded.attention
    pending.current.add(taskId)
    setBusy(new Set(pending.current))
    generation.current++
    setLoaded(current => ({
      ...current,
      blocks: current.blocks.filter(block => block.task_id !== taskId),
      dueTasks: current.dueTasks.filter(task => task.id !== taskId),
      attention: current.attention.filter(item => item.task.id !== taskId),
    }))

    try {
      await deleteTaskAction(taskId)
      notifyTasksChanged()
      return true
    } catch (cause) {
      setLoaded(current => ({
        ...current,
        blocks: previousBlocks,
        dueTasks: previousDueTasks,
        attention: previousAttention,
      }))
      toast.error(cause instanceof Error ? cause.message : 'Task was not deleted.')
      return false
    } finally {
      pending.current.delete(taskId)
      setBusy(new Set(pending.current))
      await latestReload.current()
    }
  }
  async function skip(taskId: string, sessionId: string, skipped: boolean) {
    if (pending.current.has(taskId)) return false
    const previous = loaded.blocks.find(block => blockKey(block) === sessionId) ?? null
    if (!previous) return false
    pending.current.add(taskId)
    setBusy(new Set(pending.current))
    generation.current++
    setLoaded(current => ({
      ...current,
      blocks: current.blocks.map(block => blockKey(block) === sessionId ? { ...block, status: skipped ? 'skipped' : 'scheduled' } : block),
    }))
    try {
      if (skipped) await skipTimeBlock(sessionId)
      else await restoreTimeBlock(sessionId)
      notifyPlanTimeChanged('agenda')
      return true
    } catch (cause) {
      setLoaded(current => ({ ...current, blocks: current.blocks.map(block => blockKey(block) === sessionId ? previous : block) }))
      toast.error(cause instanceof Error ? cause.message : 'Session state was not saved.')
      return false
    } finally {
      pending.current.delete(taskId)
      setBusy(new Set(pending.current))
      await latestReload.current()
    }
  }
  async function complete(task: TaskWithList, occurrenceId?: string | null) {
    if (pending.current.has(task.id)) return false
    const completed = !task.completed
    const update = (candidate: TaskWithList, nextCompleted: boolean) =>
      candidate.id === task.id
        ? { ...candidate, completed: nextCompleted }
        : candidate

    setTaskBusy(task.id, true)
    setLoaded(current => ({
      ...current,
      dueTasks: occurrenceId ? current.dueTasks : current.dueTasks.map(candidate => update(candidate, completed)),
      blocks: current.blocks.map(block => (block.task_id === task.id && (!occurrenceId || block.occurrence_id === occurrenceId))
        ? { ...block, task: update(block.task, completed) }
        : block),
    }))

    try {
      if (occurrenceId) await updateTaskOccurrenceCompleted(occurrenceId, completed)
      else await updateTaskCompletedAction(task.id, completed, localDateKey())
      notifyTasksChanged()
      return true
    } catch (cause) {
      setLoaded(current => ({
        ...current,
        dueTasks: occurrenceId ? current.dueTasks : current.dueTasks.map(candidate => update(candidate, task.completed)),
        blocks: current.blocks.map(block => (block.task_id === task.id && (!occurrenceId || block.occurrence_id === occurrenceId))
          ? { ...block, task: update(block.task, task.completed) }
          : block),
      }))
      toast.error(cause instanceof Error ? cause.message : 'Task could not be updated.')
      return false
    } finally {
      setTaskBusy(task.id, false)
    }
  }
  async function create(input: QuickCreateInput) {
    const endsAt = taskDisplayEnd(input.startsAt, input.endsAt)
    if (
      !masterKey ||
      loaded.day !== day ||
      !isSingleDayTimedRange(input.startsAt, endsAt)
    ) {
      toast.error('Unlock your vault and choose a valid time range.')
      return false
    }

    const tempId = `planner-draft:${crypto.randomUUID()}`
    const selectedList = loaded.lists.find(list => list.id === input.listId) ?? null
    const optimisticTask: TaskWithList = {
      id: tempId,
      user_id:
        loaded.lists[0]?.user_id ??
        loaded.blocks[0]?.user_id ??
        loaded.dueTasks[0]?.user_id ??
        '',
      list_id: input.listId,
      title: input.title,
      notes: '',
      completed: false,
      due_date: null,
      due_time: null,
      category_id: null,
      position: Number.MAX_SAFE_INTEGER,
      focused: false,
      stashed: false,
      list: selectedList,
    }
    const optimisticBlock: AgendaBlock = {
      id: tempId,
      task_id: tempId,
      user_id: optimisticTask.user_id,
      starts_at: input.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'scheduled',
      task: optimisticTask,
    }

    setTaskBusy(tempId, true)
    setLoaded(current => ({
      ...current,
      blocks: [...current.blocks, optimisticBlock],
    }))
    let createdTaskId: string | null = null

    try {
      const encryptedTitle = await encryptString(input.title, masterKey)
      const savedTask = await createTaskAction({
        title: encryptedTitle,
        notes: '',
        listId: input.listId,
        categoryId: null,
        dueDate: null,
        dueTime: null,
        focused: false,
      })
      createdTaskId = savedTask.id
      const savedBlock: AgendaBlock = {
        ...optimisticBlock,
        id: `pending-session:${crypto.randomUUID()}`,
        task_id: savedTask.id,
        user_id: savedTask.user_id,
        task: {
          ...savedTask,
          title: input.title,
          notes: '',
          list: selectedList,
        },
      }

      setTaskBusy(tempId, false)
      setTaskBusy(savedTask.id, true)
      setLoaded(current => ({
        ...current,
        blocks: [
          ...current.blocks.filter(block => block.task_id !== tempId),
          savedBlock,
        ],
      }))
      const savedSession = await saveTimeBlock(savedTask.id, savedBlock.starts_at, savedBlock.ends_at)
      setLoaded(current => ({
        ...current,
        blocks: current.blocks.map(block => block.id === savedBlock.id
          ? { ...savedBlock, id: savedSession.id, status: savedSession.status }
          : block),
      }))
      setTaskBusy(savedTask.id, false)
      notifyPlanTimeChanged('agenda')
      notifyTasksChanged()
      const bounds = dayBounds(day)
      if (!isCreatedScheduleVisible(savedBlock, {
        startsAt: new Date(bounds.start).toISOString(),
        endsAt: new Date(bounds.end).toISOString(),
      })) {
        showTaskCreatedToast(savedBlock.task, loaded.lists)
      }
      return true
    } catch (cause) {
      setLoaded(current => ({
        ...current,
        blocks: current.blocks.filter(block =>
          block.task_id !== tempId && block.task_id !== createdTaskId),
      }))
      if (createdTaskId) {
        try {
          await deleteTaskAction(createdTaskId)
        } catch {
          // A rare cleanup failure leaves an unscheduled task in Inbox.
        }
      }
      toast.error(
        cause instanceof Error
          ? `Couldn't create scheduled task. ${cause.message}`
          : "Couldn't create scheduled task. Try again.",
      )
      return false
    } finally {
      setTaskBusy(tempId, false)
      if (createdTaskId) setTaskBusy(createdTaskId, false)
    }
  }
  function proposal(event: DragOverEvent | DragEndEvent) {
    const source = event.active.data.current as AgendaDrag | undefined
    const target = event.over?.data.current
    if (!source || dragIntent(source, target) !== 'schedule') return null
    const instant = snapInstant(day, (Number(target!.instant) - dayBounds(day).start) / MINUTE)
    if (source.kind === 'agenda-resize' && source.block) {
      const start = Date.parse(source.block.starts_at)
      const end = Math.max(start + 15 * MINUTE, instant + 15 * MINUTE)
      return { task: source.task, sessionId: source.block.id, start, end, persistedEnd: end }
    }
    const persistedDuration = source.block?.ends_at
      ? Date.parse(source.block.ends_at) - Date.parse(source.block.starts_at)
      : null
    const displayDuration = persistedDuration ?? SLOT_MINUTES * MINUTE
    return {
      task: source.task,
      sessionId: source.block?.id,
      start: instant,
      end: instant + displayDuration,
      persistedEnd: instant + displayDuration,
    }
  }
  function finishDrag(event: DragEndEvent) {
    const next = proposal(event)
    const source = event.active.data.current as AgendaDrag | undefined
    const target = event.over?.data.current as { kind?: string; categoryId?: string | null } | undefined

    if (source?.kind === 'task' && source.changeCategory &&
      (target?.kind === 'task-category' || target?.kind === 'task') &&
      source.categoryId !== (target.categoryId ?? null)) {
      void source.changeCategory(source.task.id, target.categoryId ?? null).catch(error => {
        toast.error(error instanceof Error ? error.message : 'Category was not changed.')
      })
    } else if (next) {
      void save(next.task, next.start, next.persistedEnd, next.sessionId)
    } else if (source && dragIntent(source, target) === 'reorder' && event.over) {
      source.reorder?.(source.task.id, String(event.over.id))
    }
    setDrag(null); setPreview(null)
  }

  return <AgendaContext.Provider value={{ open, setOpen, day, setDay, blocks: loaded.day === day ? loaded.blocks : [], dueTasks: loaded.day === day ? loaded.dueTasks : [], events: loaded.day === day ? loaded.events : [], attention: loaded.attention, lists: loaded.lists, categories: loaded.categories, loading: loading || (loaded.day !== day && !error), error, reload, save, remove, removeTask, skip, complete, create, busy, preview }}>
    <DndContext sensors={sensors} collisionDetection={args => {
      // Pointer drags must actually enter a target; keyboard drags use nearest target.
      const candidates = args.droppableContainers.filter(container => dragIntent(args.active.data.current ?? {}, container.data.current) !== 'none')
      return args.pointerCoordinates ? pointerWithin({ ...args, droppableContainers: candidates }) : closestCenter({ ...args, droppableContainers: candidates })
    }} onDragStart={event => setDrag(event.active.data.current as AgendaDrag)} onDragOver={event => setPreview(proposal(event))} onDragEnd={finishDrag} onDragCancel={() => { setDrag(null); setPreview(null) }}>
      <div className="flex h-dvh min-w-0 overflow-hidden">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background selection:bg-primary selection:text-primary-foreground">{children}</main>
        {plannerAvailable ? <AgendaPanel /> : null}
      </div>
      <DragOverlay dropAnimation={null}>{drag && <div className="max-w-60 rounded-lg border bg-background p-3 text-sm shadow-lg"><p className="truncate font-medium">{drag.task.title}</p>{preview && <p className="text-xs text-muted-foreground">{timeLabel(preview.start, calendarPreferences.timeFormat)} – {timeLabel(preview.end, calendarPreferences.timeFormat)}</p>}</div>}</DragOverlay>
    </DndContext>
  </AgendaContext.Provider>
}
