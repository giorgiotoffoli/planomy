'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString } from '@/lib/crypto/e2ee'
import { TASKS_CHANGED } from '@/components/tasks/mutations'
import { LISTS_CHANGED } from '@/components/lists/mutations'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/task-edit-dialog'
import { projectCalendarItems } from '@/lib/calendar-items'
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
  const [command, setCommand] = useState<{
    id: number
    navigation: CalendarNavigation
  } | null>(null)
  const loadVersion = useRef(0)
  const visibleRange = useRef<CalendarRangeInput | null>(null)

  const loadRange = useCallback(async (range: CalendarRangeInput) => {
    if (!masterKey) return
    const version = ++loadVersion.current

    try {
      const result = await getCalendarRangeData(range)
      const [nextDueTasks, nextScheduledTasks, nextEvents] = await Promise.all([
        decryptTasks(result.dueTasks, masterKey),
        decryptScheduledTasks(result.scheduledTasks, masterKey),
        decryptEvents(result.events, masterKey),
      ])
      if (version === loadVersion.current) {
        setDueTasks(nextDueTasks)
        setScheduledTasks(nextScheduledTasks)
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
  }, [masterKey])

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
        setDueTasks(nextTasks)
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
  }, [initialCategories, initialLists, initialTasks, masterKey])

  useEffect(() => {
    const refresh = () => {
      if (visibleRange.current) void loadRange(visibleRange.current)
    }
    const onVisibility = () => {
      if (!document.hidden) refresh()
    }

    window.addEventListener(TASKS_CHANGED, refresh)
    window.addEventListener(LISTS_CHANGED, refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener(TASKS_CHANGED, refresh)
      window.removeEventListener(LISTS_CHANGED, refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [loadRange])

  const calendarItems = useMemo(
    () => projectCalendarItems(dueTasks ?? [], scheduledTasks, events),
    [dueTasks, events, scheduledTasks],
  )
  const selectedTask = useMemo(
    () => {
      if (!selectedTaskId) return null
      return (
        dueTasks?.find((task) => task.id === selectedTaskId) ??
        scheduledTasks.find((block) => block.task.id === selectedTaskId)?.task ??
        null
      )
    },
    [dueTasks, scheduledTasks, selectedTaskId],
  )

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <CalendarHeader
        rangeLabel={rangeLabel}
        viewMode={viewMode}
        onNavigate={navigate}
        onViewChange={setViewMode}
        onCreate={() => toast.info('Event creation is coming in a later pass.')}
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
            onRangeLabelChange={setRangeLabel}
            onRangeChange={handleRangeChange}
            onTaskOpen={setSelectedTaskId}
          />
        </div>
      </div>

      {selectedTask ? (
        <TaskEditDialog
          task={selectedTask}
          lists={lists}
          categories={categories}
          currentListId={selectedTask.list_id}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedTaskId(null)
          }}
        />
      ) : null}
    </div>
  )
}
