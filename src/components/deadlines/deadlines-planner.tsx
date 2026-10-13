'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  CircleAlert,
  Plus,
  Sunrise,
  Sun,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Category, List, TaskWithList } from '@/types'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { localDateKey } from '@/lib/today'
import {
  deadlineTaskCount,
  getDeadlineDateLabel,
  partitionDeadlineTasks,
  type DeadlineBucket,
} from '@/lib/deadlines'
import { getDueTimeLabel } from '@/lib/home'
import { getDeadlineTasks } from '@/components/tasks/queries'
import {
  TASKS_CHANGED,
  deleteTask,
  notifyTasksChanged,
  renameTask,
  updateTaskDueDate,
  updateTaskNotes,
} from '@/components/tasks/mutations'
import {
  updateTaskCompleted,
} from '@/components/tasks/actions'
import { setTaskFocused, setTaskStashed } from '@/components/home/actions'
import { changeTaskCategory } from '@/components/tasks/mutations'
import Header from '@/components/layout/header/app-header'
import CreateTaskDialog from '@/components/tasks/create-task/create-task-dialog'
import { TaskItem } from '@/components/tasks/task-item/task-item'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DeadlineSection from './deadline-section'

type DeadlinePlannerProps = {
  initialTasks: TaskWithList[]
  initialLists: List[]
  initialCategories: Category[]
}

const deadlineSections: {
  bucket: DeadlineBucket
  title: string
  tone: 'pastDue' | 'today' | 'tomorrow' | 'thisWeek' | 'later'
  icon: React.ReactNode
}[] = [
  { bucket: 'pastDue', title: 'Past Due', tone: 'pastDue', icon: <CircleAlert className="size-5" /> },
  { bucket: 'today', title: 'Today', tone: 'today', icon: <Sun className="size-5" /> },
  { bucket: 'tomorrow', title: 'Tomorrow', tone: 'tomorrow', icon: <Sunrise className="size-5" /> },
  { bucket: 'thisWeek', title: 'This Week', tone: 'thisWeek', icon: <CalendarDays className="size-5" /> },
  { bucket: 'later', title: 'Later', tone: 'later', icon: <CalendarRange className="size-5" /> },
]

function decryptTasks(tasks: TaskWithList[], masterKey: Uint8Array) {
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

function decryptLists(lists: List[], masterKey: Uint8Array) {
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

function decryptCategories(categories: Category[], masterKey: Uint8Array) {
  return Promise.all(
    categories.map(async (category) => ({
      ...category,
      title: await decryptString(category.title, masterKey),
    })),
  )
}

function DeadlineTaskMeta({
  task,
  bucket,
  day,
}: {
  task: TaskWithList
  bucket: DeadlineBucket
  day: string
}) {
  const dateLabel = getDeadlineDateLabel(task, bucket, day)
  const timeLabel = getDueTimeLabel(task.due_time)
  const label =
    bucket === 'today' || bucket === 'tomorrow'
      ? timeLabel
      : [dateLabel, timeLabel].filter(Boolean).join(' · ')

  if (!label && !task.stashed) return null

  return (
    <div className="flex max-w-40 items-center justify-end gap-1.5 sm:max-w-none">
      {task.stashed && (
        <span className="hidden rounded-full bg-slate-900/[0.06] px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/5 dark:text-muted-foreground sm:inline-flex">
          Stashed
        </span>
      )}
      {label && (
        <span
          className={`truncate rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs ${
            bucket === 'pastDue'
              ? 'bg-rose-100 text-rose-700 dark:border dark:border-urgency-today-border dark:bg-urgency-today-bg dark:text-urgency-today'
              : bucket === 'today'
                ? 'bg-blue-100 text-blue-700 dark:border dark:border-urgency-today-border dark:bg-urgency-today-bg dark:text-urgency-today'
                : bucket === 'tomorrow'
                  ? 'bg-violet-100 text-violet-700 dark:border dark:border-urgency-tomorrow-border dark:bg-urgency-tomorrow-bg dark:text-urgency-tomorrow'
                : bucket === 'thisWeek'
                    ? 'bg-yellow-100 text-yellow-700 dark:border dark:border-urgency-week-border dark:bg-urgency-week-bg dark:text-urgency-week'
                    : 'bg-slate-100 text-slate-600 dark:border dark:border-urgency-later-border dark:bg-urgency-later-bg dark:text-urgency-later'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

function DeadlineTaskRow({
  task,
  bucket,
  day,
  lists,
  categories,
  onComplete,
  onRename,
  onDueDateChange,
  onNotesChange,
  onDelete,
  onFocus,
  onStash,
  onChangeCategory,
}: {
  task: TaskWithList
  bucket: DeadlineBucket
  day: string
  lists: List[]
  categories?: Category[]
  onComplete: (taskId: string, completed: boolean) => void
  onRename: (taskId: string, title: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onNotesChange: (taskId: string, notes: string) => void
  onDelete: (taskId: string) => void
  onFocus: (taskId: string, focused: boolean) => void
  onStash: (taskId: string, stashed: boolean) => void
  onChangeCategory: (taskId: string, categoryId: string | null) => Promise<void>
}) {
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
      categories={categories}
      handleOnChangeCategory={onChangeCategory}
      showDueDate={false}
      trailingActions={<DeadlineTaskMeta task={task} bucket={bucket} day={day} />}
    />
  )
}

export default function DeadlinesPlanner({
  initialTasks,
  initialLists,
  initialCategories,
}: DeadlinePlannerProps) {
  const { masterKey } = useE2EE()
  const [day, setDay] = useState(() => localDateKey())
  const dayRef = useRef(day)
  const [tasks, setTasks] = useState<TaskWithList[] | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const loadVersion = useRef(0)

  const load = useCallback(async () => {
    if (!masterKey) return

    const version = ++loadVersion.current
    setError(null)

    try {
      const nextTasks = await getDeadlineTasks()
      const decryptedTasks = await decryptTasks(nextTasks, masterKey)
      if (version === loadVersion.current) setTasks(decryptedTasks)
    } catch (cause) {
      if (version === loadVersion.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Deadlines could not be loaded.',
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
      .then(([decryptedTasks, decryptedLists, decryptedCategories]) => {
        if (cancelled) return
        setTasks(decryptedTasks)
        setLists(decryptedLists)
        setCategories(decryptedCategories)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Deadlines could not be loaded.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [initialCategories, initialLists, initialTasks, masterKey])

  const refreshForDateOrChange = useCallback(() => {
    const nextDay = localDateKey()
    if (dayRef.current !== nextDay) {
      dayRef.current = nextDay
      setDay(nextDay)
    }
    void load()
  }, [load])

  useEffect(() => {
    const refreshCalendar = () => {
      const nextDay = localDateKey()
      if (dayRef.current === nextDay) return
      dayRef.current = nextDay
      setDay(nextDay)
    }
    const onVisibility = () => {
      if (!document.hidden) refreshForDateOrChange()
    }

    const interval = window.setInterval(refreshCalendar, 60_000)
    window.addEventListener(TASKS_CHANGED, refreshForDateOrChange)
    window.addEventListener('focus', refreshForDateOrChange)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener(TASKS_CHANGED, refreshForDateOrChange)
      window.removeEventListener('focus', refreshForDateOrChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refreshForDateOrChange])

  const buckets = useMemo(
    () => partitionDeadlineTasks(tasks ?? [], day),
    [day, tasks],
  )
  const taskCount = deadlineTaskCount(buckets)
  const categoriesByListId = useMemo(() => {
    const result = new Map<string, Category[]>()
    for (const category of categories) {
      const listCategories = result.get(category.list_id) ?? []
      listCategories.push(category)
      result.set(category.list_id, listCategories)
    }
    return result
  }, [categories])

  function updateTask(taskId: string, change: Partial<TaskWithList>) {
    setTasks((current) =>
      current?.map((task) =>
        task.id === taskId ? { ...task, ...change } : task,
      ) ?? null,
    )
  }

  async function handleComplete(taskId: string, completed: boolean) {
    const previous = tasks
    updateTask(taskId, { completed })

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
    if (focused && !currentTask.focused && focusedCount >= 3) {
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
    } catch (cause) {
      setTasks(previous)
      toast.error(
        cause instanceof Error ? cause.message : 'Task was not deleted.',
      )
    }
  }

  async function handleChangeCategory(
    taskId: string,
    categoryId: string | null,
  ) {
    const previous = tasks
    updateTask(taskId, { category_id: categoryId })
    try {
      await changeTaskCategory(taskId, categoryId)
    } catch (cause) {
      setTasks(previous)
      throw cause
    }
  }

  const taskDialog = (
    <CreateTaskDialog
      lists={lists}
      categories={categories}
      listId={null}
    >
      <Button className="h-10 shrink-0 rounded-xl bg-primary px-4 hover:bg-accent-hover active:bg-accent-active">
        <Plus />
        <span className="hidden sm:inline">Add task</span>
        <span className="sm:hidden">Add</span>
      </Button>
    </CreateTaskDialog>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Header
        headerTitle="Deadlines"
        taskCount={taskCount}
      />
      <main className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em] text-foreground">
                Deadlines
              </h1>
              <p className="mt-2 text-base text-slate-500 dark:text-muted-foreground sm:text-lg">
                Everything with a deadline, ordered by urgency.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">{taskDialog}</div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200"
            >
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          )}

          {!tasks && !error && (
            <div className="space-y-3" aria-label="Loading Deadlines">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          )}

          {tasks && taskCount === 0 && (
            <div className="flex min-h-[min(58vh,34rem)] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white/55 px-6 py-12 text-center shadow-[0_8px_28px_rgba(62,84,120,0.04)] dark:border-border dark:bg-surface/60 dark:shadow-none">
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <CalendarCheck2 className="size-8" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-2xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-foreground">
                Nothing coming up
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-muted-foreground">
                You&apos;re clear for now. Tasks without deadlines will still
                stay visible on Home.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild className="rounded-xl bg-primary hover:bg-primary/90">
                  <Link href="/home">Go to Home</Link>
                </Button>
                <CreateTaskDialog
                  lists={lists}
                  categories={categories}
                  listId={null}
                >
                  <Button variant="outline" className="rounded-xl">
                    <Plus /> Add task
                  </Button>
                </CreateTaskDialog>
              </div>
            </div>
          )}

          {tasks && taskCount > 0 && (
            <div className="space-y-3">
              {deadlineSections.map((section) => {
                const sectionTasks = buckets[section.bucket]
                if (sectionTasks.length === 0) return null

                return (
                  <DeadlineSection
                    key={section.bucket}
                    id={`deadline-${section.bucket}`}
                    title={section.title}
                    count={sectionTasks.length}
                    icon={section.icon}
                    tone={section.tone}
                  >
                    {sectionTasks.map((task) => (
                      <DeadlineTaskRow
                        key={task.id}
                        task={task}
                        bucket={section.bucket}
                        day={day}
                        lists={lists}
                        categories={
                          task.list_id
                            ? categoriesByListId.get(task.list_id)
                            : undefined
                        }
                        onComplete={handleComplete}
                        onRename={handleRename}
                        onDueDateChange={handleDueDateChange}
                        onNotesChange={handleNotesChange}
                        onDelete={handleDelete}
                        onFocus={handleFocus}
                        onStash={handleStash}
                        onChangeCategory={handleChangeCategory}
                      />
                    ))}
                  </DeadlineSection>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
