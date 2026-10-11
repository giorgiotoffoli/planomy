'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Clock3,
  ListTodo,
  Plus,
  Search,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { localDateKey } from '@/lib/today'
import {
  DUE_SOON_DAYS,
  getDeadlineLabel,
  getDueTimeLabel,
  getHomeBuckets,
  MAX_FOCUS_TASKS,
} from '@/lib/home'
import type { List, TaskWithList } from '@/types'
import { getHomeData } from './queries'
import { setTaskFocused, setTaskStashed } from './actions'
import { createTask as createTaskAction } from '@/components/tasks/actions'
import {
  TASKS_CHANGED,
  deleteTask,
  notifyTasksChanged,
  renameTask,
  updateTaskCompleted,
  updateTaskDueDate,
  updateTaskNotes,
} from '@/components/tasks/mutations'
import Header from '@/components/layout/header/app-header'
import CreateTaskDialog from '@/components/tasks/create-task/create-task-dialog'
import { TaskItem } from '@/components/tasks/task-item/task-item'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type HomeData = Awaited<ReturnType<typeof getHomeData>>

const OPENING_MESSAGES = [
  'Let’s make a little room for what matters. ✨',
  'A clear place to begin. You’ve got this. 🌤️',
  'Pick a thread and make it lighter. ✨',
  'Your next right thing is waiting here. 🌱',
  'Small steps count today. Let’s start there. ✨',
]

function decryptHomeData(data: HomeData, masterKey: Uint8Array) {
  return Promise.all([
    Promise.all(
      data.lists.map(async (list) => ({
        ...list,
        title: await decryptString(list.title, masterKey),
      })),
    ),
    Promise.all(
      data.tasks.map(async (task) => ({
        ...task,
        title: await decryptString(task.title, masterKey),
        notes: task.notes
          ? await decryptString(task.notes, masterKey)
          : task.notes,
        list: task.list
          ? {
              ...task.list,
              title: await decryptString(task.list.title, masterKey),
            }
          : task.list,
      })),
    ),
  ]).then(([lists, tasks]) => ({ lists, tasks }))
}

type HomeTaskRowProps = {
  task: TaskWithList
  lists: List[]
  deadlineLabel?: string | null
  deadlineTime?: string | null
  onComplete: (taskId: string, completed: boolean) => void
  onRename: (taskId: string, title: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onNotesChange: (taskId: string, notes: string) => void
  onDelete: (taskId: string) => void
  onFocus: (taskId: string, focused: boolean) => void
  onStash: (taskId: string, stashed: boolean) => void
}

function HomeTaskRow({
  task,
  lists,
  deadlineLabel,
  deadlineTime,
  onComplete,
  onRename,
  onDueDateChange,
  onNotesChange,
  onDelete,
  onFocus,
  onStash,
}: HomeTaskRowProps) {
  const deadlineIsOverdue = deadlineLabel?.includes('overdue')

  return (
    <TaskItem
      task={task}
      lists={lists}
      currentListId={null}
      highlighted={false}
      shouldHideCompleted
      isInbox={false}
      canReorder={false}
      handleOnComplete={onComplete}
      handleOnRename={onRename}
      handleOnDueDateChange={onDueDateChange}
      handleOnNotesChange={onNotesChange}
      handleOnDelete={onDelete}
      handleOnFocus={onFocus}
      handleOnStash={onStash}
      showDueDate={false}
      trailingActions={
        <div className="flex items-center gap-1.5">
          {deadlineLabel && (
            <span
              className={`inline-flex max-w-28 truncate rounded-full px-2.5 py-1 text-[11px] font-medium sm:max-w-none sm:text-xs ${
                deadlineIsOverdue
                  ? 'bg-rose-100 text-rose-700'
                  : deadlineLabel === 'Today'
                    ? 'bg-orange-100 text-orange-700'
                    : deadlineLabel === 'Tomorrow'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deadlineLabel}
              {deadlineTime ? ` · ${deadlineTime}` : ''}
            </span>
          )}
          {!task.stashed && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={task.focused ? 'Remove from Focus' : 'Add to Focus'}
              aria-label={task.focused ? 'Remove from Focus' : 'Add to Focus'}
              aria-pressed={task.focused}
              onClick={() => onFocus(task.id, !task.focused)}
              className={
                task.focused
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-slate-400'
              }
            >
              <Star className={task.focused ? 'fill-current' : undefined} />
            </Button>
          )}
        </div>
      }
    />
  )
}

type SectionShellProps = {
  title: string
  count: number
  icon: ReactNode
  tone: 'focus' | 'due' | 'tasks'
  children: ReactNode
  empty: ReactNode
  compactWhenEmpty?: boolean
}

function SectionShell({
  title,
  count,
  icon,
  tone,
  children,
  empty,
  compactWhenEmpty = false,
}: SectionShellProps) {
  const [open, setOpen] = useState(true)
  const toneClasses = {
    focus: 'border-blue-100/80 bg-[#eef3ff]',
    due: 'border-amber-100/80 bg-[#fff8e9]',
    tasks: 'border-slate-200/80 bg-white/80',
  }
  const compactEmpty = count === 0 && compactWhenEmpty

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`rounded-[20px] border shadow-[0_12px_32px_rgba(62,84,120,0.05)] ${compactEmpty ? 'px-3 py-2.5 sm:px-4 sm:py-3' : 'p-3 sm:p-4'} ${toneClasses[tone]}`}
    >
      <h2
        className={`${compactEmpty ? '' : 'mb-2'} flex items-center px-1.5 py-1`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
            className="group flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <span
              className={
                tone === 'focus'
                  ? 'text-blue-600'
                  : tone === 'due'
                    ? 'text-amber-600'
                    : 'text-blue-700'
              }
            >
              {icon}
            </span>
            <span className="font-heading text-lg font-semibold tracking-[-0.02em] text-slate-950">
              {title}
            </span>
            <span className="flex size-7 items-center justify-center rounded-full bg-slate-900/[0.06] text-xs font-semibold text-slate-600">
              {count}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`ml-auto size-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
        {count > 0 ? (
          <ul className="overflow-hidden rounded-[15px] border border-slate-200/80 bg-white/90 divide-y divide-slate-200/80">
            {children}
          </ul>
        ) : compactEmpty ? (
          <p className="px-1.5 pt-0.5 text-xs text-slate-500">{empty}</p>
        ) : (
          <div className="rounded-[15px] border border-dashed border-slate-300/70 bg-white/55 px-5 py-7 text-center text-sm text-slate-500">
            {empty}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function HomePlanner({
  initialData,
}: {
  initialData: HomeData
}) {
  const { masterKey } = useE2EE()
  const [day, setDay] = useState(() => localDateKey())
  const dayRef = useRef(day)
  const [tasks, setTasks] = useState<TaskWithList[] | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [stashedOpen, setStashedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadVersion = useRef(0)

  const applyData = useCallback(async (data: HomeData, key: Uint8Array) => {
    const decryptedData = await decryptHomeData(data, key)
    setLists(decryptedData.lists)
    setTasks(decryptedData.tasks)
  }, [])

  const load = useCallback(async () => {
    if (!masterKey) return

    const version = ++loadVersion.current
    setError(null)

    try {
      const nextData = await getHomeData()
      if (version === loadVersion.current) await applyData(nextData, masterKey)
    } catch (cause) {
      if (version === loadVersion.current) {
        setError(
          cause instanceof Error ? cause.message : 'Home could not be loaded.',
        )
      }
    }
  }, [applyData, masterKey])

  useEffect(() => {
    if (!masterKey) return

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      applyData(initialData, masterKey).catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Home could not be loaded.',
          )
        }
      })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [applyData, initialData, masterKey])

  useEffect(() => {
    const refreshCalendar = () => {
      const nextDay = localDateKey()
      if (dayRef.current === nextDay) return
      dayRef.current = nextDay
      setDay(nextDay)
    }
    const refreshTasks = () => {
      refreshCalendar()
      void load()
    }

    const interval = window.setInterval(refreshCalendar, 60_000)
    const onVisibility = () => {
      if (!document.hidden) refreshTasks()
    }

    window.addEventListener(TASKS_CHANGED, refreshTasks)
    window.addEventListener('focus', refreshTasks)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener(TASKS_CHANGED, refreshTasks)
      window.removeEventListener('focus', refreshTasks)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [load])

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return tasks ?? []

    return (tasks ?? []).filter((task) =>
      [task.title, task.notes, task.list?.title]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    )
  }, [searchQuery, tasks])

  const buckets = useMemo(
    () => getHomeBuckets(filteredTasks, day),
    [day, filteredTasks],
  )

  const activeCount =
    tasks?.filter((task) => !task.completed && !task.stashed).length ?? 0
  const message =
    OPENING_MESSAGES[
      day.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        OPENING_MESSAGES.length
    ]

  function updateTask(taskId: string, change: Partial<TaskWithList>) {
    setTasks(
      (current) =>
        current?.map((task) =>
          task.id === taskId ? { ...task, ...change } : task,
        ) ?? null,
    )
  }

  async function handleComplete(taskId: string, completed: boolean) {
    const previous = tasks
    updateTask(taskId, { completed, ...(completed ? { focused: false } : {}) })

    try {
      await updateTaskCompleted(taskId, completed)
      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Change was not saved.',
      )
    }
  }

  async function handleFocus(taskId: string, focused: boolean) {
    const currentTask = tasks?.find((task) => task.id === taskId)
    if (!currentTask || currentTask.stashed) return

    const focusedCount =
      tasks?.filter((task) => task.focused && !task.stashed && !task.completed)
        .length ?? 0
    if (focused && !currentTask.focused && focusedCount >= MAX_FOCUS_TASKS) {
      toast.error('You can focus up to three tasks. Remove one first.')
      return
    }

    const previous = tasks
    updateTask(taskId, { focused })

    try {
      await setTaskFocused(taskId, focused)
      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Focus was not changed.',
      )
    }
  }

  async function handleStash(taskId: string, stashed: boolean) {
    const previous = tasks
    updateTask(taskId, { stashed, ...(stashed ? { focused: false } : {}) })

    try {
      await setTaskStashed(taskId, stashed)
      notifyTasksChanged()
      if (stashed) setStashedOpen(true)
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Stash change was not saved.',
      )
    }
  }

  async function handleRename(taskId: string, title: string) {
    if (!masterKey) return
    const previous = tasks
    updateTask(taskId, { title })

    try {
      await renameTask(taskId, await encryptString(title, masterKey))
      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Rename was not saved.',
      )
    }
  }

  async function handleDueDateChange(taskId: string, dueDate: string) {
    const previous = tasks
    updateTask(taskId, { due_date: dueDate || null })

    try {
      await updateTaskDueDate(taskId, dueDate)
      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Due date was not saved.',
      )
    }
  }

  async function handleNotesChange(taskId: string, notes: string) {
    if (!masterKey) return
    const previous = tasks
    updateTask(taskId, { notes })

    try {
      await updateTaskNotes(taskId, await encryptString(notes, masterKey))
      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Notes were not saved.',
      )
    }
  }

  async function handleDelete(taskId: string) {
    const previous = tasks
    setTasks((current) => current?.filter((task) => task.id !== taskId) ?? null)

    try {
      await deleteTask(taskId)
      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Task was not deleted.',
      )
    }
  }

  async function handleCreate(
    title: string,
    dueDate: string,
    notes: string,
    listId: string | null,
  ) {
    if (!masterKey) return

    try {
      const saved = await createTaskAction(
        await encryptString(title, masterKey),
        dueDate,
        notes ? await encryptString(notes, masterKey) : '',
        listId,
      )

      if (!saved) throw new Error('Task was not created.')

      const selectedList = lists.find((list) => list.id === listId) ?? null
      setTasks((current) =>
        current
          ? [{ ...saved, title, notes, list: selectedList }, ...current]
          : current,
      )
      notifyTasksChanged()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Task was not created.',
      )
    }
  }

  function renderTask(task: TaskWithList, includeDeadline = false) {
    return (
      <HomeTaskRow
        key={task.id}
        task={task}
        lists={lists}
        deadlineLabel={
          includeDeadline ? getDeadlineLabel(task.due_date, day) : null
        }
        deadlineTime={includeDeadline ? getDueTimeLabel(task.due_time) : null}
        onComplete={handleComplete}
        onRename={handleRename}
        onDueDateChange={handleDueDateChange}
        onNotesChange={handleNotesChange}
        onDelete={handleDelete}
        onFocus={handleFocus}
        onStash={handleStash}
      />
    )
  }

  const formattedDay = format(new Date(`${day}T12:00:00`), 'EEEE, MMMM d')

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Header headerTitle="Home" taskCount={activeCount} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em] text-[#10172c]">
                {formattedDay}
              </h1>
              <p className="mt-2 text-base text-slate-500 sm:text-lg">
                {message}
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <label
                className="relative min-w-0 flex-1 sm:w-64"
                aria-label="Search tasks"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tasks..."
                  className="h-10 rounded-xl border-slate-200/90 bg-white/80 pl-9 shadow-[0_6px_20px_rgba(62,84,120,0.05)]"
                />
              </label>
              <CreateTaskDialog
                lists={lists}
                listId={null}
                handleOnCreate={handleCreate}
              >
                <Button className="h-10 shrink-0 rounded-xl bg-blue-500 px-4 shadow-[0_8px_18px_rgba(37,99,235,0.22)] hover:bg-blue-600">
                  <Plus />
                  <span className="hidden sm:inline">Add task</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </CreateTaskDialog>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          )}

          {!tasks && !error && (
            <div className="space-y-5" aria-label="Loading Home">
              <Skeleton className="h-40 w-full rounded-[20px]" />
              <Skeleton className="h-48 w-full rounded-[20px]" />
              <Skeleton className="h-56 w-full rounded-[20px]" />
            </div>
          )}

          {tasks && (
            <div className="space-y-4">
              <SectionShell
                title="Focus"
                count={buckets.focus.length}
                icon={<Star className="size-6" />}
                tone="focus"
                empty="Pick up to three tasks to keep close today."
                compactWhenEmpty
              >
                {buckets.focus.map((task) => renderTask(task))}
              </SectionShell>

              <SectionShell
                title="Due Soon"
                count={buckets.dueSoon.length}
                icon={<Clock3 className="size-6" />}
                tone="due"
                empty={`Nothing due in the next ${DUE_SOON_DAYS} days. Your future self says thanks.`}
                compactWhenEmpty
              >
                {buckets.dueSoon.map((task) => renderTask(task, true))}
              </SectionShell>

              <SectionShell
                title="Tasks"
                count={buckets.tasks.length}
                icon={<ListTodo className="size-6" />}
                tone="tasks"
                empty={
                  searchQuery
                    ? 'No tasks match that search.'
                    : 'Everything is captured. Enjoy the clear space.'
                }
              >
                {buckets.tasks.map((task) => renderTask(task))}
              </SectionShell>

              <Collapsible
                open={stashedOpen}
                onOpenChange={setStashedOpen}
                className="overflow-hidden rounded-[20px] border border-blue-100/80 bg-[#e9f0ff] shadow-[0_12px_32px_rgba(62,84,120,0.04)]"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    <Archive className="size-5 text-blue-700" />
                    <span className="font-semibold text-slate-900">
                      Stashed
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-900/[0.06] text-xs font-semibold text-slate-600">
                      {buckets.stashed.length}
                    </span>
                    <span className="ml-auto text-xs text-slate-500">
                      {stashedOpen ? 'Hide' : 'Show'}
                    </span>
                    {stashedOpen ? (
                      <ArchiveRestore className="size-4 text-slate-500" />
                    ) : (
                      <Archive className="size-4 text-slate-500" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                  {buckets.stashed.length > 0 ? (
                    <ul className="overflow-hidden rounded-[15px] border border-slate-200/80 bg-white/90 divide-y divide-slate-200/80">
                      {buckets.stashed.map((task) => renderTask(task))}
                    </ul>
                  ) : (
                    <div className="rounded-[15px] border border-dashed border-slate-300/70 bg-white/55 px-5 py-6 text-center text-sm text-slate-500">
                      Nothing is stashed right now.
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
