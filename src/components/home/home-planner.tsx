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
import TaskSortSelect from '@/components/lists/task-sort-select'
import {
  isTaskSortOption,
  sortTasks,
  type TaskSortOption,
} from '@/components/lists/task-sorting'
import {
  DUE_SOON_DAYS,
  defaultHomeSourcePreferences,
  filterHomeTasks,
  getDeadlineLabel,
  getDueTimeLabel,
  getHomeBuckets,
  getHomeSources,
  getHomeSourceState,
  MAX_FOCUS_TASKS,
  setHomeCategoryEnabled,
  setHomeListEnabled,
  setHomeSourceEnabled,
  type HomeSource,
  type HomeSourcePreferences,
} from '@/lib/home'
import type { Category, List, TaskWithList } from '@/types'
import { getHomeData } from './queries'
import {
  setHomeCategoryVisibility,
  setHomeSourceVisibility,
  setTaskFocused,
  setTaskStashed,
  showAllHomeSources,
} from './actions'
import HomeSourcesPicker from './home-sources-picker'
import { updateTaskCompleted as updateTaskCompletedAction } from '@/components/tasks/actions'
import {
  TASKS_CHANGED,
  deleteTask,
  notifyTasksChanged,
  renameTask,
  updateTaskDueDate,
  updateTaskNotes,
} from '@/components/tasks/mutations'
import Header from '@/components/layout/header/app-header'
import CreateTaskDialog from '@/components/tasks/create-task/create-task-dialog'
import {
  TaskItem,
  waitForTaskExit,
} from '@/components/tasks/task-item/task-item'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type HomeData = Awaited<ReturnType<typeof getHomeData>>

const HOME_SORT_STORAGE_KEY = 'planomy:home-sort'

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
        emoji: list.emoji
          ? await decryptString(list.emoji, masterKey)
          : list.emoji,
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
              emoji: task.list.emoji
                ? await decryptString(task.list.emoji, masterKey)
                : task.list.emoji,
            }
          : task.list,
      })),
    ),
    Promise.all(
      data.categories.map(async (category) => ({
        ...category,
        title: await decryptString(category.title, masterKey),
      })),
    ),
    Promise.resolve(data.homePreferences),
  ]).then(([lists, tasks, categories, homePreferences]) => ({
    lists,
    tasks,
    categories,
    homePreferences,
  }))
}

type HomeTaskRowProps = {
  task: TaskWithList
  lists: List[]
  categories: Category[]
  deadlineLabel?: string | null
  deadlineTime?: string | null
  onComplete: (taskId: string, completed: boolean) => void
  onRename: (taskId: string, title: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onNotesChange: (taskId: string, notes: string) => void
  onDelete: (taskId: string) => void
  onFocus: (taskId: string, focused: boolean) => void
  onStash: (taskId: string, stashed: boolean) => void
  isExiting: boolean
}

function HomeTaskRow({
  task,
  lists,
  categories,
  deadlineLabel,
  deadlineTime,
  onComplete,
  onRename,
  onDueDateChange,
  onNotesChange,
  onDelete,
  onFocus,
  onStash,
  isExiting,
}: HomeTaskRowProps) {
  const deadlineIsOverdue = deadlineLabel?.includes('overdue')

  return (
    <TaskItem
      task={task}
      lists={lists}
      categories={categories}
      currentListId={null}
      highlighted={false}
      shouldHideCompleted
      isInbox={false}
      canReorder={false}
      showAddToList
      isExiting={isExiting}
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
  compactEmptyLabel?: string
}

function SectionShell({
  title,
  count,
  icon,
  tone,
  children,
  empty,
  compactWhenEmpty = false,
  compactEmptyLabel,
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
      className={`rounded-2xl border shadow-[0_6px_18px_rgba(62,84,120,0.04)] ${compactEmpty ? 'px-2.5 py-2 sm:px-3 sm:py-2.5' : 'p-2.5 sm:p-3'} ${toneClasses[tone]}`}
    >
      <h2
        className={`${compactEmpty ? '' : 'mb-1.5'} flex items-center px-1 py-0.5`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
            className="group flex w-full items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
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
            <span className="font-heading text-base font-semibold tracking-[-0.02em] text-slate-950 sm:text-lg">
              {title}
            </span>
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-900/[0.06] text-[11px] font-semibold text-slate-600">
              {count}
            </span>
            {compactEmpty && (
              <span
                className="ml-auto min-w-0 truncate text-right text-xs text-slate-500"
                title={compactEmptyLabel}
              >
                {compactEmptyLabel}
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={`${compactEmpty ? '' : 'ml-auto'} size-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
        {count > 0 ? (
          <ul className="divide-y divide-slate-200/70">{children}</ul>
        ) : compactEmpty ? (
          <p className="hidden px-1.5 pt-0.5 text-xs leading-5 text-slate-500 lg:block">
            {empty}
          </p>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300/70 bg-white/55 px-4 py-5 text-center text-sm text-slate-500">
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
  const [categories, setCategories] = useState<Category[]>([])
  const [homePreferences, setHomePreferences] = useState<HomeSourcePreferences>(
    () => initialData.homePreferences,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<TaskSortOption>('manual')
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [stashedOpen, setStashedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadVersion = useRef(0)
  const homePreferenceSaveQueue = useRef(Promise.resolve())
  const homePreferenceChangeVersion = useRef(0)

  const applyData = useCallback(
    async (
      data: HomeData,
      key: Uint8Array,
      preferenceVersion: number,
      shouldApplyData: () => boolean = () => true,
    ) => {
      const decryptedData = await decryptHomeData(data, key)
      if (!shouldApplyData()) return

      setLists(decryptedData.lists)
      setTasks(decryptedData.tasks)
      setCategories(decryptedData.categories)
      if (preferenceVersion === homePreferenceChangeVersion.current) {
        setHomePreferences(decryptedData.homePreferences)
      }
    },
    [],
  )

  const load = useCallback(async () => {
    if (!masterKey) return

    const version = ++loadVersion.current
    setError(null)

    try {
      await homePreferenceSaveQueue.current.catch(() => {})
      const preferenceVersion = homePreferenceChangeVersion.current
      const nextData = await getHomeData()
      if (version === loadVersion.current) {
        await applyData(
          nextData,
          masterKey,
          preferenceVersion,
          () => version === loadVersion.current,
        )
      }
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
    const preferenceVersion = homePreferenceChangeVersion.current
    const timeoutId = window.setTimeout(() => {
      void homePreferenceSaveQueue.current
        .catch(() => {})
        .then(() =>
          applyData(
            initialData,
            masterKey,
            preferenceVersion,
            () => !cancelled,
          ),
        )
        .catch((cause) => {
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
    const timeoutId = window.setTimeout(() => {
      try {
        const savedSortOption = window.localStorage.getItem(
          HOME_SORT_STORAGE_KEY,
        )

        if (savedSortOption && isTaskSortOption(savedSortOption)) {
          setSortOption(savedSortOption)
        }
      } catch {
        // Local storage can be unavailable in private browsing contexts.
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

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

  const homeSources = useMemo(() => getHomeSources(lists), [lists])
  const uncategorizedListIds = useMemo(
    () =>
      new Set(
        (tasks ?? [])
          .filter((task) => task.list_id !== null && task.category_id == null)
          .map((task) => task.list_id as string),
      ),
    [tasks],
  )
  const enabledHomeSourceCount = homeSources.filter(
    (source) =>
      getHomeSourceState(
        source,
        categories,
        homePreferences,
        source.type === 'list' && uncategorizedListIds.has(source.listId),
      ) !== 'disabled',
  ).length

  const homeTasks = useMemo(
    () => filterHomeTasks(tasks ?? [], homePreferences, categories),
    [categories, homePreferences, tasks],
  )

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return homeTasks

    return homeTasks.filter((task) =>
      [task.title, task.notes, task.list?.title]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    )
  }, [homeTasks, searchQuery])

  const buckets = useMemo(() => {
    const homeBuckets = getHomeBuckets(filteredTasks, day)

    return {
      focus: sortTasks(homeBuckets.focus, sortOption),
      dueSoon: sortTasks(homeBuckets.dueSoon, sortOption),
      tasks: sortTasks(homeBuckets.tasks, sortOption),
      stashed: sortTasks(homeBuckets.stashed, sortOption),
    }
  }, [day, filteredTasks, sortOption])

  const hasVisibleHomeTasks = Object.values(buckets).some(
    (bucket) => bucket.length > 0,
  )

  const activeCount = homeTasks.filter(
    (task) => !task.completed && !task.stashed && !exitingTaskIds.has(task.id),
  ).length
  const message =
    OPENING_MESSAGES[
      day.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        OPENING_MESSAGES.length
    ]

  function handleSortChange(nextSortOption: TaskSortOption) {
    setSortOption(nextSortOption)

    try {
      window.localStorage.setItem(HOME_SORT_STORAGE_KEY, nextSortOption)
    } catch {
      // Local storage can be unavailable in private browsing contexts.
    }
  }

  function enqueueHomePreferenceSave(operation: () => Promise<void>) {
    const nextSave = homePreferenceSaveQueue.current
      .catch(() => {})
      .then(operation)
    homePreferenceSaveQueue.current = nextSave
    return nextSave
  }

  async function handleHomeSourceChange(source: HomeSource, visible: boolean) {
    const previous = homePreferences
    const next =
      source.type === 'list'
        ? setHomeListEnabled(previous, source.listId, visible, categories)
        : setHomeSourceEnabled(previous, source, visible)
    const changeVersion = ++homePreferenceChangeVersion.current
    setHomePreferences(next)

    try {
      await enqueueHomePreferenceSave(() =>
        setHomeSourceVisibility(source, visible),
      )
    } catch (cause) {
      if (changeVersion === homePreferenceChangeVersion.current) {
        setHomePreferences(previous)
      }
      toast.error(
        cause instanceof Error
          ? cause.message
          : 'Home source visibility was not saved.',
      )
    }
  }

  async function handleHomeCategoryChange(
    categoryId: string,
    visible: boolean,
  ) {
    const previous = homePreferences
    const next = setHomeCategoryEnabled(
      previous,
      categoryId,
      visible,
      categories,
      categories.some(
        (category) =>
          category.id === categoryId &&
          uncategorizedListIds.has(category.list_id),
      ),
    )
    const changeVersion = ++homePreferenceChangeVersion.current
    setHomePreferences(next)

    try {
      await enqueueHomePreferenceSave(() =>
        setHomeCategoryVisibility(categoryId, visible),
      )
    } catch (cause) {
      if (changeVersion === homePreferenceChangeVersion.current) {
        setHomePreferences(previous)
      }
      toast.error(
        cause instanceof Error
          ? cause.message
          : 'Home category visibility was not saved.',
      )
    }
  }

  async function handleShowAllHomeSources() {
    const previous = homePreferences
    const changeVersion = ++homePreferenceChangeVersion.current
    setHomePreferences(defaultHomeSourcePreferences())

    try {
      await enqueueHomePreferenceSave(showAllHomeSources)
    } catch (cause) {
      if (changeVersion === homePreferenceChangeVersion.current) {
        setHomePreferences(previous)
      }
      toast.error(
        cause instanceof Error
          ? cause.message
          : 'Home source visibility was not saved.',
      )
    }
  }

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

    if (completed) {
      if (exitingTaskIds.has(taskId)) return

      setExitingTaskIds((current) => {
        const next = new Set(current)
        next.add(taskId)
        return next
      })
    } else {
      updateTask(taskId, { completed })
    }

    try {
      await updateTaskCompletedAction(taskId, completed)

      if (completed) {
        await waitForTaskExit()
        setTasks(
          (current) => current?.filter((task) => task.id !== taskId) ?? null,
        )
        setExitingTaskIds((current) => {
          const next = new Set(current)
          next.delete(taskId)
          return next
        })
      }

      notifyTasksChanged()
    } catch (cause) {
      setTasks(previous)
      setExitingTaskIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
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

  function renderTask(task: TaskWithList, includeDeadline = false) {
    return (
      <HomeTaskRow
        key={task.id}
        task={task}
        lists={lists}
        categories={categories}
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
        isExiting={exitingTaskIds.has(task.id)}
      />
    )
  }

  const formattedDay = format(new Date(`${day}T12:00:00`), 'EEEE, MMMM d')
  const dueSoonHasTasks = buckets.dueSoon.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Header headerTitle="Home" taskCount={activeCount} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        <div className="mx-auto w-full max-w-360">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em] text-[#10172c]">
                {formattedDay}
              </h1>
              <p className="mt-2 text-base text-slate-500 sm:text-lg">
                {message}
              </p>
            </div>
            <div className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:flex-nowrap">
              <HomeSourcesPicker
                lists={lists}
                categories={categories}
                uncategorizedListIds={uncategorizedListIds}
                preferences={homePreferences}
                onSourceChange={(source, visible) => {
                  void handleHomeSourceChange(source, visible)
                }}
                onCategoryChange={(categoryId, visible) => {
                  void handleHomeCategoryChange(categoryId, visible)
                }}
                onShowAll={() => void handleShowAllHomeSources()}
              />
              <TaskSortSelect
                value={sortOption}
                onValueChange={handleSortChange}
                iconOnlyOnMobile
              />
              <label
                className="relative col-span-4 row-start-2 min-w-0 w-full sm:order-3 sm:col-auto sm:row-auto sm:w-64"
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
                categories={categories}
                listId={null}
              >
                <Button className="col-start-4 row-start-1 h-10 shrink-0 rounded-xl bg-blue-500 px-3 shadow-[0_8px_18px_rgba(37,99,235,0.22)] hover:bg-blue-600 sm:order-4 sm:col-auto sm:row-auto sm:px-4">
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
            <div className="space-y-3">
              {enabledHomeSourceCount === 0 && !hasVisibleHomeTasks ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-6 text-center shadow-[0_6px_18px_rgba(62,84,120,0.04)]">
                  <h2 className="font-heading text-lg font-semibold text-slate-950">
                    Nothing is shown on Home
                  </h2>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                    All Home sources are hidden. Show all sources to bring your
                    incomplete tasks back.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4 rounded-xl"
                    onClick={() => void handleShowAllHomeSources()}
                  >
                    Show all sources
                  </Button>
                </div>
              ) : (
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <aside
                    aria-label="Attention"
                    className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:self-start"
                  >
                    <SectionShell
                      title="Focus"
                      count={buckets.focus.length}
                      icon={<Star className="size-5" />}
                      tone="focus"
                      empty="Pick up to three tasks to keep close today."
                      compactWhenEmpty
                      compactEmptyLabel="Pick tasks"
                    >
                      {buckets.focus.map((task) => renderTask(task))}
                    </SectionShell>

                    <div className={!dueSoonHasTasks ? 'hidden lg:block' : undefined}>
                      <SectionShell
                        title="Due Soon"
                        count={buckets.dueSoon.length}
                        icon={<Clock3 className="size-5" />}
                        tone="due"
                        empty={`Nothing due in the next ${DUE_SOON_DAYS} days.`}
                        compactWhenEmpty
                        compactEmptyLabel="All clear"
                      >
                        {buckets.dueSoon.map((task) => renderTask(task, true))}
                      </SectionShell>
                    </div>

                    <Collapsible
                      open={stashedOpen}
                      onOpenChange={setStashedOpen}
                      className="overflow-hidden rounded-2xl border border-slate-300/70 bg-slate-100/70 shadow-[0_6px_18px_rgba(62,84,120,0.04)] dark:border-slate-700/70 dark:bg-slate-800/60"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                          <Archive className="size-5 text-slate-600 dark:text-slate-300" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            Stashed
                          </span>
                          <span className="flex size-6 items-center justify-center rounded-full bg-slate-200/80 text-[11px] font-semibold text-slate-600 dark:bg-slate-700/80 dark:text-slate-300">
                            {buckets.stashed.length}
                          </span>
                          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                            {stashedOpen ? 'Hide' : 'Show'}
                          </span>
                          {stashedOpen ? (
                            <ArchiveRestore className="size-4 text-slate-500 dark:text-slate-400" />
                          ) : (
                            <Archive className="size-4 text-slate-500 dark:text-slate-400" />
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
                  </aside>

                  <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                    <SectionShell
                      title="Tasks"
                      count={buckets.tasks.length}
                      icon={<ListTodo className="size-5" />}
                      tone="tasks"
                      empty={
                        searchQuery
                          ? 'No tasks match that search.'
                          : 'Everything is captured. Enjoy the clear space.'
                      }
                    >
                      {buckets.tasks.map((task) => renderTask(task))}
                    </SectionShell>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
