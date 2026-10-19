'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { applyTaskOrganizationChange } from '@/lib/tasks'
import {
  TASK_ORGANIZATION_CHANGED,
  TASKS_CHANGED,
  notifyTasksChanged,
  taskOrganizationChangeFromEvent,
} from '@/components/tasks/mutations'
import { LISTS_CHANGED } from '@/components/lists/mutations'
import {
  PLAN_TIME_CHANGED,
  notifyPlanTimeChanged,
  planTimeChangeOrigin,
} from '@/components/agenda/mutations'
import {
  createTask as createTaskAction,
  deleteTask as deleteTaskAction,
  updateTaskCompleted as updateTaskCompletedAction,
} from '@/components/tasks/actions'
import { removeTimeBlock, saveTimeBlock } from '@/components/agenda/actions'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/task-edit-dialog'
import { projectCalendarItems } from '@/lib/calendar-items'
import {
  isSingleDayTimedRange,
  taskDisplayEnd,
} from '@/lib/calendar-interactions'
import type { CalendarRangeInput } from '@/lib/events'
import type {
  AgendaBlock,
  CalendarEventWithList,
  Category,
  List,
  TaskWithList,
} from '@/types'
import { getCalendarRangeData } from './actions'
import CalendarHeader, {
  type CalendarNavigation,
  type CalendarViewMode,
} from './calendar-header'
import CalendarView from './calendar-view'
import type { QuickCreateInput } from './calendar-quick-create'

function replaceScheduledBlock(
  blocks: AgendaBlock[],
  next: AgendaBlock | null,
  taskId: string,
) {
  const remaining = blocks.filter((block) => block.task_id !== taskId)
  return next ? [...remaining, next] : remaining
}

function applyPendingSchedules(
  blocks: AgendaBlock[],
  pending: Map<string, AgendaBlock | null>,
) {
  let merged = blocks
  for (const [taskId, block] of pending) {
    merged = replaceScheduledBlock(merged, block, taskId)
  }
  return merged
}

async function decryptTasks(tasks: TaskWithList[], masterKey: Uint8Array) {
  return Promise.all(
    tasks.map(async (task) => ({
      ...task,
      title: await decryptString(task.title, masterKey),
      notes: task.notes
        ? await decryptString(task.notes, masterKey)
        : task.notes,
      list: task.list
        ? {
            ...task.list,
            title: await decryptString(task.list.title, masterKey),
            emoji: task.list.emoji
              ? await decryptString(task.list.emoji, masterKey)
              : task.list.emoji,
          }
        : task.list,
    })),
  )
}

async function decryptLists(lists: List[], masterKey: Uint8Array) {
  return Promise.all(
    lists.map(async (list) => ({
      ...list,
      title: await decryptString(list.title, masterKey),
      emoji: list.emoji
        ? await decryptString(list.emoji, masterKey)
        : list.emoji,
    })),
  )
}

async function decryptScheduledTasks(
  blocks: AgendaBlock[],
  masterKey: Uint8Array,
) {
  return Promise.all(
    blocks.map(async (block) => ({
      ...block,
      task: (await decryptTasks([block.task], masterKey))[0],
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

async function decryptCategories(
  categories: Category[],
  masterKey: Uint8Array,
) {
  return Promise.all(
    categories.map(async (category) => ({
      ...category,
      title: await decryptString(category.title, masterKey),
    })),
  )
}

export default function CalendarPage({
  initialTasks,
  initialLists,
  initialCategories,
}: {
  initialTasks: TaskWithList[]
  initialLists: List[]
  initialCategories: Category[]
}) {
  const { masterKey } = useE2EE()
  const [dueTasks, setDueTasks] = useState<TaskWithList[] | null>(null)
  const [scheduledTasks, setScheduledTasks] = useState<AgendaBlock[]>([])
  const [events, setEvents] = useState<CalendarEventWithList[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [rangeLabel, setRangeLabel] = useState('This week')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [busyTaskIds, setBusyTaskIds] = useState<Set<string>>(() => new Set())
  const [command, setCommand] = useState<{
    id: number
    navigation: CalendarNavigation
  } | null>(null)
  const loadVersion = useRef(0)
  const visibleRange = useRef<CalendarRangeInput | null>(null)
  const dueTasksRef = useRef<TaskWithList[] | null>(null)
  const scheduledTasksRef = useRef<AgendaBlock[]>([])
  const pendingSchedules = useRef(new Map<string, AgendaBlock | null>())
  const pendingTasks = useRef(new Set<string>())

  const commitDueTasks = useCallback((tasks: TaskWithList[] | null) => {
    dueTasksRef.current = tasks
    setDueTasks(tasks)
  }, [])

  const commitScheduledTasks = useCallback((blocks: AgendaBlock[]) => {
    scheduledTasksRef.current = blocks
    setScheduledTasks(blocks)
  }, [])

  const setTaskBusy = useCallback((taskId: string, busy: boolean) => {
    if (busy) pendingTasks.current.add(taskId)
    else pendingTasks.current.delete(taskId)
    setBusyTaskIds(new Set(pendingTasks.current))
  }, [])

  const loadRange = useCallback(
    async (range: CalendarRangeInput) => {
      if (!masterKey) return
      const version = ++loadVersion.current

      try {
        const result = await getCalendarRangeData(range)
        const [nextDueTasks, nextScheduledTasks, nextEvents] =
          await Promise.all([
            decryptTasks(result.dueTasks, masterKey),
            decryptScheduledTasks(result.scheduledTasks, masterKey),
            decryptEvents(result.events, masterKey),
          ])
        if (version === loadVersion.current) {
          commitDueTasks(nextDueTasks)
          commitScheduledTasks(
            applyPendingSchedules(nextScheduledTasks, pendingSchedules.current),
          )
          setEvents(nextEvents)
        }
      } catch (cause) {
        if (version === loadVersion.current) {
          toast.error(
            cause instanceof Error
              ? cause.message
              : 'Calendar items could not be loaded.',
          )
        }
      }
    },
    [commitDueTasks, commitScheduledTasks, masterKey],
  )

  useEffect(() => {
    if (!masterKey) return

    let cancelled = false
    Promise.all([
      decryptTasks(initialTasks, masterKey),
      decryptLists(initialLists, masterKey),
      decryptCategories(initialCategories, masterKey),
    ])
      .then(([nextTasks, nextLists, nextCategories]) => {
        if (cancelled) return
        commitDueTasks(nextTasks)
        setLists(nextLists)
        setCategories(nextCategories)
      })
      .catch((cause) => {
        if (!cancelled) {
          toast.error(
            cause instanceof Error
              ? cause.message
              : 'Calendar tasks could not be decrypted.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [commitDueTasks, initialCategories, initialLists, initialTasks, masterKey])

  useEffect(() => {
    const refresh = () => {
      if (visibleRange.current) void loadRange(visibleRange.current)
    }
    const organizationChanged = (event: Event) => {
      const change = taskOrganizationChangeFromEvent(event)
      if (!change) return

      loadVersion.current++
      commitDueTasks(
        dueTasksRef.current?.map((task) =>
          applyTaskOrganizationChange(task, lists, change),
        ) ?? null,
      )
      commitScheduledTasks(
        scheduledTasksRef.current.map((block) => ({
          ...block,
          task: applyTaskOrganizationChange(block.task, lists, change),
        })),
      )
    }
    const onVisibility = () => {
      if (!document.hidden) refresh()
    }

    window.addEventListener(TASKS_CHANGED, refresh)
    window.addEventListener(TASK_ORGANIZATION_CHANGED, organizationChanged)
    window.addEventListener(LISTS_CHANGED, refresh)
    const refreshPlanTime = (event: Event) => {
      if (planTimeChangeOrigin(event) !== 'calendar') refresh()
    }
    window.addEventListener(PLAN_TIME_CHANGED, refreshPlanTime)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener(TASKS_CHANGED, refresh)
      window.removeEventListener(
        TASK_ORGANIZATION_CHANGED,
        organizationChanged,
      )
      window.removeEventListener(LISTS_CHANGED, refresh)
      window.removeEventListener(PLAN_TIME_CHANGED, refreshPlanTime)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [commitDueTasks, commitScheduledTasks, lists, loadRange])

  const calendarItems = useMemo(
    () => projectCalendarItems(dueTasks ?? [], scheduledTasks, events),
    [dueTasks, events, scheduledTasks],
  )
  const editingTask = useMemo(() => {
    if (!editingTaskId) return null
    return (
      dueTasks?.find((task) => task.id === editingTaskId) ??
      scheduledTasks.find((block) => block.task.id === editingTaskId)?.task ??
      null
    )
  }, [dueTasks, editingTaskId, scheduledTasks])

  function navigate(navigation: CalendarNavigation) {
    setCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      navigation,
    }))
  }

  const handleRangeChange = useCallback(
    (range: CalendarRangeInput) => {
      visibleRange.current = range
      void loadRange(range)
    },
    [loadRange],
  )

  const handleTaskSchedule = useCallback(
    async (task: TaskWithList, startsAt: Date, endsAt: Date | null) => {
      const normalizedEndsAt = taskDisplayEnd(startsAt, endsAt)
      if (
        pendingTasks.current.has(task.id) ||
        !isSingleDayTimedRange(startsAt, normalizedEndsAt)
      )
        return false

      const previous =
        scheduledTasksRef.current.find((block) => block.task_id === task.id) ??
        null
      const next: AgendaBlock = {
        task_id: task.id,
        user_id: task.user_id,
        starts_at: startsAt.toISOString(),
        ends_at: normalizedEndsAt.toISOString(),
        task,
      }

      pendingSchedules.current.set(task.id, next)
      setTaskBusy(task.id, true)
      commitScheduledTasks(
        replaceScheduledBlock(scheduledTasksRef.current, next, task.id),
      )

      try {
        await saveTimeBlock(task.id, next.starts_at, next.ends_at)
        pendingSchedules.current.delete(task.id)
        notifyPlanTimeChanged('calendar')
        return true
      } catch (cause) {
        pendingSchedules.current.delete(task.id)
        commitScheduledTasks(
          replaceScheduledBlock(scheduledTasksRef.current, previous, task.id),
        )
        toast.error(
          cause instanceof Error
            ? `Couldn't update scheduled time. ${cause.message}`
            : "Couldn't update scheduled time. Changes were reverted.",
        )
        return false
      } finally {
        setTaskBusy(task.id, false)
      }
    },
    [commitScheduledTasks, setTaskBusy],
  )

  const handleTaskUnschedule = useCallback(
    async (task: TaskWithList) => {
      if (pendingTasks.current.has(task.id)) return false
      const previous =
        scheduledTasksRef.current.find((block) => block.task_id === task.id) ??
        null
      if (!previous) return true

      pendingSchedules.current.set(task.id, null)
      setTaskBusy(task.id, true)
      commitScheduledTasks(
        replaceScheduledBlock(scheduledTasksRef.current, null, task.id),
      )
      setSelectedTaskId(null)

      try {
        await removeTimeBlock(task.id)
        pendingSchedules.current.delete(task.id)
        notifyPlanTimeChanged('calendar')
        return true
      } catch (cause) {
        pendingSchedules.current.delete(task.id)
        commitScheduledTasks(
          replaceScheduledBlock(scheduledTasksRef.current, previous, task.id),
        )
        toast.error(
          cause instanceof Error
            ? `Couldn't unschedule task. ${cause.message}`
            : "Couldn't unschedule task. Changes were reverted.",
        )
        return false
      } finally {
        setTaskBusy(task.id, false)
      }
    },
    [commitScheduledTasks, setTaskBusy],
  )

  const handleTaskComplete = useCallback(
    async (task: TaskWithList) => {
      if (pendingTasks.current.has(task.id)) return false
      const completed = !task.completed
      const updateTask = (candidate: TaskWithList) =>
        candidate.id === task.id ? { ...candidate, completed } : candidate

      setTaskBusy(task.id, true)
      commitDueTasks(dueTasksRef.current?.map(updateTask) ?? null)
      commitScheduledTasks(
        scheduledTasksRef.current.map((block) =>
          block.task_id === task.id
            ? { ...block, task: { ...block.task, completed } }
            : block,
        ),
      )

      try {
        await updateTaskCompletedAction(task.id, completed)
        notifyTasksChanged()
        return true
      } catch (cause) {
        const restoreTask = (candidate: TaskWithList) =>
          candidate.id === task.id
            ? { ...candidate, completed: task.completed }
            : candidate
        commitDueTasks(dueTasksRef.current?.map(restoreTask) ?? null)
        commitScheduledTasks(
          scheduledTasksRef.current.map((block) =>
            block.task_id === task.id
              ? { ...block, task: { ...block.task, completed: task.completed } }
              : block,
          ),
        )
        toast.error(
          cause instanceof Error ? cause.message : 'Task could not be updated.',
        )
        return false
      } finally {
        setTaskBusy(task.id, false)
      }
    },
    [commitDueTasks, commitScheduledTasks, setTaskBusy],
  )

  const handleQuickCreate = useCallback(
    async (input: QuickCreateInput) => {
      const endsAt = taskDisplayEnd(input.startsAt, input.endsAt)
      if (!masterKey || !isSingleDayTimedRange(input.startsAt, endsAt)) {
        toast.error('Unlock your vault and choose a valid time range.')
        return false
      }

      const tempId = `calendar-draft:${crypto.randomUUID()}`
      const selectedList =
        lists.find((list) => list.id === input.listId) ?? null
      const optimisticTask: TaskWithList = {
        id: tempId,
        user_id:
          scheduledTasksRef.current[0]?.user_id ??
          dueTasksRef.current?.[0]?.user_id ??
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
        task_id: tempId,
        user_id: optimisticTask.user_id,
        starts_at: input.startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        task: optimisticTask,
      }

      pendingSchedules.current.set(tempId, optimisticBlock)
      setTaskBusy(tempId, true)
      commitScheduledTasks([...scheduledTasksRef.current, optimisticBlock])
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
        const localTask: TaskWithList = {
          ...savedTask,
          title: input.title,
          notes: '',
          list: selectedList,
        }
        const savedBlock: AgendaBlock = {
          ...optimisticBlock,
          task_id: savedTask.id,
          user_id: savedTask.user_id,
          task: localTask,
        }

        pendingSchedules.current.delete(tempId)
        pendingSchedules.current.set(savedTask.id, savedBlock)
        setTaskBusy(tempId, false)
        setTaskBusy(savedTask.id, true)
        commitScheduledTasks([
          ...scheduledTasksRef.current.filter(
            (block) => block.task_id !== tempId,
          ),
          savedBlock,
        ])

        await saveTimeBlock(
          savedTask.id,
          savedBlock.starts_at,
          savedBlock.ends_at,
        )
        pendingSchedules.current.delete(savedTask.id)
        notifyPlanTimeChanged('calendar')
        return true
      } catch (cause) {
        pendingSchedules.current.delete(tempId)
        if (createdTaskId) pendingSchedules.current.delete(createdTaskId)
        commitScheduledTasks(
          scheduledTasksRef.current.filter(
            (block) =>
              block.task_id !== tempId && block.task_id !== createdTaskId,
          ),
        )
        if (createdTaskId) {
          try {
            await deleteTaskAction(createdTaskId)
          } catch {
            // The scheduled draft is still removed locally. A rare cleanup
            // failure leaves an unscheduled task that can be managed in Inbox.
          }
        }
        toast.error(
          cause instanceof Error
            ? `Couldn't create scheduled task. ${cause.message}`
            : "Couldn't create scheduled task. The draft was removed.",
        )
        return false
      } finally {
        setTaskBusy(tempId, false)
        if (createdTaskId) setTaskBusy(createdTaskId, false)
      }
    },
    [commitScheduledTasks, lists, masterKey, setTaskBusy],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <CalendarHeader
        rangeLabel={rangeLabel}
        viewMode={viewMode}
        onNavigate={navigate}
        onViewChange={setViewMode}
        onCreate={() =>
          toast.info('Click or drag an empty time to add a task.')
        }
      />
      <div
        className="flex min-h-0 flex-1 flex-col bg-surface pb-2 pt-2 sm:pb-3 lg:pb-4"
        aria-busy={dueTasks === null}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border-subtle bg-surface">
          <CalendarView
            viewMode={viewMode}
            command={command}
            calendarItems={calendarItems}
            lists={lists}
            selectedTaskId={selectedTaskId}
            busyTaskIds={busyTaskIds}
            onRangeLabelChange={setRangeLabel}
            onRangeChange={handleRangeChange}
            onTaskSelect={setSelectedTaskId}
            onTaskOpen={setEditingTaskId}
            onTaskSchedule={handleTaskSchedule}
            onTaskUnschedule={handleTaskUnschedule}
            onTaskComplete={handleTaskComplete}
            onQuickCreate={handleQuickCreate}
          />
        </div>
      </div>

      {editingTask ? (
        <TaskEditDialog
          task={editingTask}
          lists={lists}
          categories={categories}
          currentListId={editingTask.list_id}
          open
          onOpenChange={(open) => {
            if (!open) setEditingTaskId(null)
          }}
        />
      ) : null}
    </div>
  )
}
