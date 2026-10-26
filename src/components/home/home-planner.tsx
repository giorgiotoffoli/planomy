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
  Package,
  PackageOpen,
  AlertTriangle,
  CalendarFold,
  ChevronDown,
  Clock3,
  ListTodo,
  Repeat,
  Search,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { addCalendarDays, calendarDaysBetween, localDateKey } from '@/lib/today'
import { nextOccurrenceDate } from '@/lib/recurrence'
import { applyTaskOrganizationChange, matchesTaskSearch } from '@/lib/tasks'
import type { TaskCreationView } from '@/lib/task-creation'
import TaskSortSelect from '@/components/lists/task-sort-select'
import {
  isTaskSortOption,
  sortTasks,
  type TaskSortOption,
} from '@/components/lists/task-sorting'
import {
  defaultHomeSourcePreferences,
  filterHomeEvents,
  filterHomeTasks,
  getDeadlineLabel,
  getDueTimeLabel,
  getHomeBuckets,
  getHomeSources,
  getHomeSourceState,
  HOME_UPCOMING_DAYS,
  MAX_FOCUS_TASKS,
  setHomeCategoryEnabled,
  setHomeListEnabled,
  setHomeSourceEnabled,
  type HomeSource,
  type HomeSourcePreferences,
} from '@/lib/home'
import type {
  CalendarEventWithList,
  Category,
  List,
  NeedsAttentionItem,
  TaskOccurrence,
  TaskWithList,
} from '@/types'
import EventDialog from '@/components/events/event-dialog'
import {
  EVENTS_CHANGED,
  eventVisualMutationFromEvent,
} from '@/components/events/mutations'
import {
  LISTS_CHANGED,
  listMutationFromEvent,
} from '@/components/lists/mutations'
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
import { updateTaskOccurrenceSkipped } from '@/components/tasks/recurrence-actions'
import { eventColorStyle, inheritedColorStyle } from '@/lib/list-colors'
import { ListEmoji } from '@/components/lists/list-emoji'
import { skipTimeBlock } from '@/components/agenda/actions'
import {
  TASK_ORGANIZATION_CHANGED,
  TASKS_CHANGED,
  deleteTask,
  notifyTasksChanged,
  renameTask,
  taskVisualMutationFromEvent,
  updateTaskDueDate,
  updateTaskNotes,
  taskOrganizationChangeFromEvent,
} from '@/components/tasks/mutations'
import {
  applyEventVisualMutation,
  applyCategoryMutationToEvent,
  applyCategoryMutationToTask,
  applyCategoryMutationToCategory,
  applyListMutationToEvent,
  applyListMutationToList,
  applyListMutationToTask,
  applyTaskVisualMutation,
} from '@/lib/live-mutations'
import {
  CATEGORIES_CHANGED,
  categoryVisualMutationFromEvent,
} from '@/components/categories/mutations'
import CreateTaskAction from '@/components/tasks/create-task/create-task-action'
import CollapsiblePageHeader from '@/components/layout/header/collapsible-page-header'
import AgendaToggle from '@/components/agenda/agenda-toggle'
import {
  TaskItem,
  waitForTaskExit,
} from '@/components/tasks/task-item/task-item'
import { TaskCheckbox } from '@/components/tasks/task-item/task-checkbox'
import { TaskTitle } from '@/components/tasks/task-item/task-title'
import TaskDetail from '@/components/tasks/task-item/task-details'
import { TaskEditDropdown } from '@/components/tasks/task-item/task-edit/task-edit-dropdown'
import type { TaskOccurrenceContext } from '@/components/tasks/task-form/task-occurrence-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { TaskEditDialog } from '@/components/tasks/task-item/task-edit/task-edit-dialog'
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

function eventLocalParts(event: CalendarEventWithList) {
  if (!event.starts_at) return { date: event.starts_on, time: null }
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZone: event.time_zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(event.starts_at))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

type UpcomingSectionKey = 'overdue' | 'today' | 'week'

type UpcomingTaskEntry = {
  kind: 'task'
  task: TaskWithList
  section: UpcomingSectionKey
  label: string
  time: string | null
  sortKey: string
  tieBreak: number
}

type UpcomingEventEntry = {
  kind: 'event'
  event: CalendarEventWithList
  section: UpcomingSectionKey
  label: string
  time: string | null
  sortKey: string
  tieBreak: number
}

type UpcomingEntry = UpcomingTaskEntry | UpcomingEventEntry

const UPCOMING_SECTION_LABELS: Record<UpcomingSectionKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'Coming up this week',
}

function upcomingSectionForDate(dateKey: string, day: string): UpcomingSectionKey {
  if (dateKey < day) return 'overdue'
  return dateKey === day ? 'today' : 'week'
}

function formatUpcomingTime(value: string | null) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatUpcomingDay(dateKey: string) {
  return format(new Date(`${dateKey}T12:00:00`), 'EEE')
}

function formatOverdueLabel(dateKey: string, day: string) {
  const daysLate = Math.abs(calendarDaysBetween(day, dateKey))
  return `${daysLate} day${daysLate === 1 ? '' : 's'} late`
}

function decryptHomeData(data: HomeData, masterKey: Uint8Array) {
  const decryptTask = async (task: TaskWithList) => ({
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
  })

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
      data.tasks.map(decryptTask),
    ),
    Promise.all(
      data.categories.map(async (category) => ({
        ...category,
        title: await decryptString(category.title, masterKey),
      })),
    ),
    Promise.resolve(data.homePreferences),
    Promise.all(
      data.attention.map(async (item) => ({
        ...item,
        task: await decryptTask(item.task),
      })),
    ),
    Promise.all(data.upcomingEvents.map(async (event) => ({
      ...event,
      title: await decryptString(event.title, masterKey),
      description: event.description ? await decryptString(event.description, masterKey) : event.description,
      location: event.location ? await decryptString(event.location, masterKey) : event.location,
      list: event.list ? {
        ...event.list,
        title: await decryptString(event.list.title, masterKey),
        emoji: event.list.emoji ? await decryptString(event.list.emoji, masterKey) : event.list.emoji,
      } : null,
    }))),
  ]).then(([lists, tasks, categories, homePreferences, attention, upcomingEvents]) => ({
    lists,
    tasks,
    categories,
    homePreferences,
    currentOccurrences: data.currentOccurrences,
    attention,
    upcomingEvents,
  }))
}

function getDeadlineBadgeClassName(deadlineLabel?: string | null) {
  if (deadlineLabel?.includes('overdue')) {
    return 'border-destructive/15 bg-destructive/8 text-destructive'
  }

  if (deadlineLabel === 'Today') {
    return 'border-urgency-today-border bg-urgency-today-bg text-urgency-today'
  }

  if (deadlineLabel === 'Tomorrow') {
    return 'border-urgency-tomorrow-border bg-urgency-tomorrow-bg text-urgency-tomorrow'
  }

  return 'border-urgency-later-border bg-urgency-later-bg text-urgency-later'
}

function getUpcomingPillClassName(section: UpcomingSectionKey) {
  return getDeadlineBadgeClassName(
    section === 'overdue' ? 'overdue' : section === 'today' ? 'Today' : 'Later',
  )
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
      showCategory
      compact
      trailingActions={
        <div className="flex items-center gap-1.5">
          {deadlineLabel && (
            <span
              className={`inline-flex max-w-28 truncate rounded-full border px-2.5 py-1 text-[11px] font-medium sm:max-w-none sm:text-xs ${getDeadlineBadgeClassName(deadlineLabel)}`}
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
                  ? 'text-yellow-400 hover:text-yellow-500 dark:text-kanban-board-circle-yellow dark:hover:text-yellow-300'
                  : 'text-slate-400 dark:text-muted-foreground'
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

function UpcomingTaskRow({
  entry,
  lists,
  categories,
  onComplete,
  onRename,
  onDueDateChange,
  onNotesChange,
  onDelete,
  onFocus,
  onStash,
  isExiting,
}: {
  entry: UpcomingTaskEntry
  lists: List[]
  categories: Category[]
  onComplete: (taskId: string, completed: boolean) => void
  onRename: (taskId: string, title: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onNotesChange: (taskId: string, notes: string) => void
  onDelete: (taskId: string) => void
  onFocus: (taskId: string, focused: boolean) => void
  onStash: (taskId: string, stashed: boolean) => void
  isExiting: boolean
}) {
  const displayTask = isExiting ? { ...entry.task, completed: true } : entry.task
  const status = entry.section === 'overdue'
    ? entry.label
    : `${entry.label}${entry.time ? ` · ${entry.time}` : ''}`

  return (
    <li
      className="group"
      style={inheritedColorStyle(entry.task.category?.color, entry.task.list?.color)}
    >
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isExiting ? 'pointer-events-none grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-0 py-2.5">
            <div className="flex h-7 items-center pt-0.5">
              <TaskCheckbox
                task={displayTask}
                handleOnComplete={onComplete}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight">
                <TaskTitle task={displayTask} handleOnRename={onRename} />
              </div>
              <div className="upcoming-task-detail [&>div]:text-xs">
                <TaskDetail
                  task={displayTask}
                  currentListId={null}
                  lists={lists}
                  isInbox={false}
                  showDueDate={false}
                  showAddToList
                  categories={categories}
                  showCategory
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={`inline-flex max-w-28 truncate rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums sm:max-w-none sm:text-xs ${getUpcomingPillClassName(entry.section)}`}
              >
                {status}
              </span>
              {!entry.task.stashed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={entry.task.focused ? 'Remove from Focus' : 'Add to Focus'}
                  aria-label={entry.task.focused ? 'Remove from Focus' : 'Add to Focus'}
                  aria-pressed={entry.task.focused}
                  onClick={() => onFocus(entry.task.id, !entry.task.focused)}
                  className={
                    entry.task.focused
                      ? 'h-7 w-7 shrink-0 cursor-pointer text-yellow-400 hover:text-yellow-500 dark:text-kanban-board-circle-yellow dark:hover:text-yellow-300'
                      : 'h-7 w-7 shrink-0 cursor-pointer text-slate-400 dark:text-muted-foreground'
                  }
                >
                  <Star className={entry.task.focused ? 'fill-current' : undefined} />
                </Button>
              )}
              <TaskEditDropdown
                task={displayTask}
                lists={lists}
                currentListId={null}
                handleOnDueDateChange={onDueDateChange}
                handleOnNotesChange={onNotesChange}
                handleOnDelete={onDelete}
                handleOnRename={onRename}
                handleOnFocus={onFocus}
                handleOnStash={onStash}
                categories={categories}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={`Actions for ${entry.task.title}`}
                  aria-label={`Actions for ${entry.task.title}`}
                  className="h-7 w-7 shrink-0 cursor-pointer"
                >
                  ⋯
                </Button>
              </TaskEditDropdown>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

function UpcomingEventRow({
  entry,
  categories,
  onOpen,
}: {
  entry: UpcomingEventEntry
  categories: Category[]
  onOpen: () => void
}) {
  const status = entry.section === 'today'
    ? entry.time ?? 'All day'
    : `${entry.label}${entry.time ? ` · ${entry.time}` : ''}`
  const categoryTitle = entry.event.category_id
    ? categories.find((category) => category.id === entry.event.category_id)?.title
    : null

  return (
    <li
      className="group"
      style={eventColorStyle(entry.event.color, entry.event.category?.color, entry.event.list?.color)}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-0 py-2.5">
        <button
          type="button"
          className="flex h-7 items-center pt-0.5 text-(--list-color) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpen}
          aria-label={`Edit event: ${entry.event.title}`}
        >
          <CalendarFold className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpen}
        >
          <span className="block break-words text-sm font-medium leading-tight">
            {entry.event.title}
          </span>
          {entry.event.list || categoryTitle ? (
            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-tight text-muted-foreground">
              {entry.event.list ? (
                <>
                  <ListEmoji emoji={entry.event.list.emoji} className="text-base" />
                  <span className="truncate">{entry.event.list.title}</span>
                </>
              ) : null}
              {entry.event.list && categoryTitle && (
                <span className="text-muted-foreground/60">/</span>
              )}
              {categoryTitle ? (
                <span className="truncate">
                  {categoryTitle}
                </span>
              ) : null}
            </span>
          ) : null}
        </button>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className={`inline-flex max-w-28 truncate rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums sm:max-w-none sm:text-xs ${getUpcomingPillClassName(entry.section)}`}>
            {status}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Edit event"
            aria-label={`Edit event: ${entry.event.title}`}
            onClick={onOpen}
            className="h-7 w-7 shrink-0 cursor-pointer"
          >
            ⋯
          </Button>
        </div>
      </div>
    </li>
  )
}

function UpcomingSection({
  entries,
  expanded,
  onExpandedChange,
  lists,
  categories,
  onComplete,
  onRename,
  onDueDateChange,
  onNotesChange,
  onDelete,
  onFocus,
  onStash,
  exitingTaskIds,
  onOpenEvent,
}: {
  entries: UpcomingEntry[]
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  lists: List[]
  categories: Category[]
  onComplete: (taskId: string, completed: boolean) => void
  onRename: (taskId: string, title: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onNotesChange: (taskId: string, notes: string) => void
  onDelete: (taskId: string) => void
  onFocus: (taskId: string, focused: boolean) => void
  onStash: (taskId: string, stashed: boolean) => void
  exitingTaskIds: Set<string>
  onOpenEvent: (event: CalendarEventWithList) => void
}) {
  const [open, setOpen] = useState(true)

  if (!entries.length) return null

  const visibleEntries = expanded ? entries : entries.slice(0, 6)
  const groups = (Object.keys(UPCOMING_SECTION_LABELS) as UpcomingSectionKey[])
    .map((key) => ({
      key,
      title: UPCOMING_SECTION_LABELS[key],
      entries: visibleEntries.filter((entry) => entry.section === key),
    }))
    .filter((group) => group.entries.length > 0)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="upcoming-panel overflow-hidden rounded-2xl border border-yellow-100/80 bg-yellow-50/75 p-3 shadow-[0_6px_18px_rgba(62,84,120,0.04)] dark:border-border dark:bg-surface dark:shadow-none sm:p-3.5"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-2.5 px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`${open ? 'Collapse' : 'Expand'} Upcoming`}
        >
          <Clock3 className="size-5 shrink-0 text-yellow-600 dark:text-yellow-200" strokeWidth={1.8} aria-hidden="true" />
          <span className="font-heading text-base font-semibold tracking-[-0.02em] sm:text-lg">Upcoming</span>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] text-[11px] font-semibold text-slate-600 dark:border dark:border-border-subtle dark:bg-surface-hover dark:text-text-secondary">
            {entries.length}
          </span>
          <ChevronDown
            className={`ml-auto size-4 text-slate-400 transition-transform duration-200 dark:text-muted-foreground motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-0.5">
          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              className={groupIndex > 0 ? 'border-t border-border/70 pt-4' : 'pt-2'}
            >
              <h2 className="text-sm font-medium uppercase leading-5 text-muted-foreground">
                {group.title}
              </h2>
              <ul className="mt-1">
                {group.entries.map((entry) => entry.kind === 'task' ? (
                  <UpcomingTaskRow
                    key={entry.task.id}
                    entry={entry}
                    lists={lists}
                    categories={categories}
                    onComplete={onComplete}
                    onRename={onRename}
                    onDueDateChange={onDueDateChange}
                    onNotesChange={onNotesChange}
                    onDelete={onDelete}
                    onFocus={onFocus}
                    onStash={onStash}
                    isExiting={exitingTaskIds.has(entry.task.id)}
                  />
                ) : (
                  <UpcomingEventRow
                    key={entry.event.id}
                    entry={entry}
                    categories={categories}
                    onOpen={() => onOpenEvent(entry.event)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
        {entries.length > 6 ? (
          <div className="border-t border-border/70 px-1 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mx-auto flex h-7 gap-2 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              onClick={() => onExpandedChange(!expanded)}
            >
              {expanded ? 'Show less' : `Show ${entries.length - 6} more`}
              <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}

type SectionShellProps = {
  title: string
  count: number
  icon: ReactNode
  tone: 'focus' | 'due' | 'tasks'
  children: ReactNode
  leadingContent?: ReactNode
  empty: ReactNode
  compactWhenEmpty?: boolean
  compactEmptyLabel?: string
  footerContent?: ReactNode
}

function SectionShell({
  title,
  count,
  icon,
  tone,
  children,
  leadingContent,
  empty,
  compactWhenEmpty = false,
  compactEmptyLabel,
  footerContent,
}: SectionShellProps) {
  const [open, setOpen] = useState(true)
  const toneClasses = {
    focus: 'border-blue-100/80 bg-[#eef3ff] dark:border-border dark:bg-surface',
    due: 'border-yellow-100/80 bg-yellow-50/75 dark:border-border dark:bg-surface',
    tasks: 'border-slate-200/80 bg-white/80 dark:border-border dark:bg-surface',
  }
  const compactEmpty = count === 0 && compactWhenEmpty
  const attentionWidget = tone === 'focus' || tone === 'due'
  const paddingClasses = compactEmpty
    ? attentionWidget
      ? 'px-3 py-2.5 sm:px-3.5 sm:py-3'
      : 'px-2.5 py-2 sm:px-3 sm:py-2.5'
    : attentionWidget
      ? 'p-3 sm:p-3.5'
      : 'p-2.5 sm:p-3'

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`rounded-2xl border shadow-[0_6px_18px_rgba(62,84,120,0.04)] dark:shadow-none ${paddingClasses} ${toneClasses[tone]}`}
    >
      <h2
        className={`${compactEmpty ? '' : 'mb-1.5'} flex items-center px-1 py-0.5`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
            className="group flex w-full items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span
              className={
                tone === 'focus'
                  ? 'text-blue-600 dark:text-accent'
                  : tone === 'due'
                    ? 'text-yellow-600 dark:text-yellow-200'
                    : 'text-blue-700 dark:text-text-secondary'
              }
            >
              {icon}
            </span>
            <span className="font-heading text-base font-semibold tracking-[-0.02em] text-foreground sm:text-lg">
              {title}
            </span>
            <span className="flex size-6 items-center justify-center rounded-full bg-slate-900/[0.06] text-[11px] font-semibold text-slate-600 dark:border dark:border-border-subtle dark:bg-surface-hover dark:text-text-secondary">
              {count}
            </span>
            {compactEmpty && (
              <span
                className="ml-auto min-w-0 truncate text-right text-xs text-slate-500 dark:text-muted-foreground"
                title={compactEmptyLabel}
              >
                {compactEmptyLabel}
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={`${compactEmpty ? '' : 'ml-auto'} size-4 text-slate-400 transition-transform duration-200 dark:text-muted-foreground ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
        {leadingContent}
        {count > 0 ? (
          <>
            <ul className="divide-y divide-slate-200/70 dark:divide-border/70">
              {children}
            </ul>
            {footerContent}
          </>
        ) : compactEmpty ? (
          <p className="hidden px-1.5 pt-0.5 text-xs leading-5 text-slate-500 dark:text-muted-foreground lg:block">
            {empty}
          </p>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300/70 bg-white/55 px-4 py-5 text-center text-sm text-slate-500 dark:border-border dark:bg-surface/60 dark:text-muted-foreground">
            {empty}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function attentionDateLabel(item: NeedsAttentionItem) {
  if (item.kind === 'missed-session' && item.session) {
    return format(new Date(item.session.starts_at), 'EEE, MMM d · h:mm a')
  }

  return item.occurrences.length === 1
    ? format(new Date(`${item.occurrences[0].occurrence_date}T12:00:00`), 'EEE, MMM d')
    : `${item.occurrences.length} missed occurrences`
}

function attentionOccurrence(item: NeedsAttentionItem): TaskOccurrenceContext | undefined {
  if (item.kind === 'missed-session' && item.session?.occurrence_id) {
    return {
      occurrenceId: item.session.occurrence_id,
      occurrenceDate: localDateKey(new Date(item.session.starts_at)),
      sessionId: item.session.id,
      sessionIndex: item.session.session_index,
      startsAt: item.session.starts_at,
      endsAt: item.session.ends_at,
    }
  }

  if (item.kind === 'missed-occurrence' && item.occurrences.length === 1) {
    return {
      occurrenceId: item.occurrences[0].id,
      occurrenceDate: item.occurrences[0].occurrence_date,
    }
  }

  return undefined
}

function NeedsAttentionSection({
  items,
  lists,
  categories,
  onComplete,
  onRename,
  onDueDateChange,
  onNotesChange,
  onDelete,
  onFocus,
  onStash,
  onSkipSession,
  onSkipOccurrence,
}: {
  items: NeedsAttentionItem[]
  lists: List[]
  categories: Category[]
  onComplete: (taskId: string, completed: boolean) => void
  onRename: (taskId: string, title: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onNotesChange: (taskId: string, notes: string) => void
  onDelete: (taskId: string) => void
  onFocus: (taskId: string, focused: boolean) => void
  onStash: (taskId: string, stashed: boolean) => void
  onSkipSession: (item: NeedsAttentionItem) => Promise<void>
  onSkipOccurrence: (occurrence: TaskOccurrence) => Promise<void>
}) {
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const unresolvedCount = items.reduce(
    (count, item) => count + (item.kind === 'missed-session' ? 1 : item.occurrences.length),
    0,
  )
  const visibleItems = showAll ? items : items.slice(0, 4)

  if (!items.length) return null

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mb-3 rounded-xl border border-amber-200/80 border-l-2 border-l-amber-400/80 bg-amber-50/55 px-2.5 py-2.5 dark:border-amber-400/20 dark:border-l-amber-300/70 dark:bg-amber-500/8"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`${open ? 'Collapse' : 'Expand'} Needs Attention`}
        >
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-300" />
          <span className="font-heading text-base font-semibold tracking-[-0.02em]">
            Needs Attention
          </span>
          <span className="flex size-6 items-center justify-center rounded-full bg-amber-200/70 text-[11px] font-semibold text-amber-900 dark:bg-amber-300/15 dark:text-amber-100">
            {unresolvedCount}
          </span>
          <ChevronDown className={`ml-auto size-4 text-amber-700/70 transition-transform dark:text-amber-200/70 ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 divide-y divide-amber-200/70 overflow-hidden rounded-xl border border-amber-200/70 bg-white/55 dark:divide-amber-300/10 dark:border-amber-300/10 dark:bg-surface/50">
          {visibleItems.map((item) => (
            <TaskItem
              key={item.id}
              task={item.task}
              lists={lists}
              categories={categories}
              currentListId={null}
              highlighted={false}
              shouldHideCompleted
              isInbox={false}
              canReorder={false}
              showDueDate={false}
              showAddToList
              compact
              handleOnComplete={onComplete}
              handleOnRename={onRename}
              handleOnDueDateChange={onDueDateChange}
              handleOnNotesChange={onNotesChange}
              handleOnDelete={onDelete}
              handleOnFocus={onFocus}
              handleOnStash={onStash}
              leadingBadge={
                <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700/80 dark:text-amber-200/80">
                  {item.kind === 'missed-occurrence' ? <Repeat className="size-3.5 shrink-0" /> : <Clock3 className="size-3.5 shrink-0" />}
                  {attentionDateLabel(item)}
                </span>
              }
              trailingActions={
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <TaskEditDialog
                    task={item.task}
                    lists={lists}
                    categories={categories}
                    currentListId={item.task.list_id}
                    focusPlanTime={item.kind === 'missed-session'}
                    occurrence={attentionOccurrence(item)}
                  >
                    <Button type="button" size="sm" variant="outline" className="rounded-lg">
                      {item.kind === 'missed-session' ? 'Reschedule' : 'Review'}
                    </Button>
                  </TaskEditDialog>
                  {item.kind === 'missed-occurrence' && item.occurrences.length > 1
                    ? item.occurrences.map((occurrence) => (
                        <Button
                          key={occurrence.id}
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 rounded-full px-2 text-[11px] text-muted-foreground"
                          onClick={() => void onSkipOccurrence(occurrence)}
                        >
                          Skip {format(new Date(`${occurrence.occurrence_date}T12:00:00`), 'MMM d')}
                        </Button>
                      ))
                    : item.kind === 'missed-session' && item.session
                      ? <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => void onSkipSession(item)}>Skip</Button>
                      : item.occurrences.length === 1
                        ? <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => void onSkipOccurrence(item.occurrences[0])}>Skip</Button>
                        : null}
                </div>
              }
            />
          ))}
        </ul>
        {items.length > 4 ? (
          <Button type="button" variant="ghost" size="sm" className="mt-1.5 h-7 px-1.5 text-xs text-muted-foreground" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Show less' : `Show ${items.length - 4} more`}
          </Button>
        ) : null}
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
  const [currentOccurrences, setCurrentOccurrences] = useState<TaskOccurrence[]>(initialData.currentOccurrences)
  const [attention, setAttention] = useState<NeedsAttentionItem[]>(initialData.attention)
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventWithList[]>([])
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithList | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [homePreferences, setHomePreferences] = useState<HomeSourcePreferences>(
    () => initialData.homePreferences,
  )
  const [currentTime, setCurrentTime] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<TaskSortOption>('manual')
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [stashedOpen, setStashedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)
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
      setCurrentOccurrences(decryptedData.currentOccurrences)
      setAttention(decryptedData.attention)
      setUpcomingEvents(decryptedData.upcomingEvents)
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
      const nextData = await getHomeData({ today: localDateKey(), now: new Date().toISOString() })
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
      setCurrentTime(Date.now())
      const nextDay = localDateKey()
      if (dayRef.current === nextDay) return
      dayRef.current = nextDay
      setDay(nextDay)
    }
    const refreshTasks = () => {
      refreshCalendar()
      void load()
    }
    const handleListsChanged = (event: Event) => {
      const change = listMutationFromEvent(event)
      if (!change) {
        refreshTasks()
        return
      }

      setLists((current) => current.map((list) => applyListMutationToList(list, change)))
      setTasks((current) =>
        current?.map((task) => applyListMutationToTask(task, change)) ?? null,
      )
      setAttention((current) =>
        current.map((item) => ({
          ...item,
          task: applyListMutationToTask(item.task, change),
        })),
      )
      setUpcomingEvents((current) =>
        current.map((item) => applyListMutationToEvent(item, change)),
      )
      if (!change.phase) refreshTasks()
    }
    const handleTasksChanged = (event: Event) => {
      const change = taskVisualMutationFromEvent(event)
      if (!change) {
        refreshTasks()
        return
      }

      if (!change.occurrenceId) {
        setTasks((current) =>
          current?.map((task) => applyTaskVisualMutation(task, change, lists)) ?? null,
        )
        setAttention((current) =>
          current.map((item) => ({
            ...item,
            task: applyTaskVisualMutation(item.task, change, lists),
          })),
        )
      }
      if (!change.phase) refreshTasks()
    }
    const handleEventsChanged = (event: Event) => {
      const change = eventVisualMutationFromEvent(event)
      if (!change) {
        refreshTasks()
        return
      }

      setUpcomingEvents((current) =>
        current.map((item) => applyEventVisualMutation(item, change, lists)),
      )
      if (!change.phase) refreshTasks()
    }
    const handleCategoriesChanged = (event: Event) => {
      const change = categoryVisualMutationFromEvent(event)
      if (!change) {
        refreshTasks()
        return
      }
      setCategories((current) => current.map((category) => applyCategoryMutationToCategory(category, change)))
      setTasks((current) => current?.map((task) => applyCategoryMutationToTask(task, change)) ?? null)
      setAttention((current) => current.map((item) => ({ ...item, task: applyCategoryMutationToTask(item.task, change) })))
      setUpcomingEvents((current) => current.map((item) => applyCategoryMutationToEvent(item, change)))
      if (!change.phase) refreshTasks()
    }
    const organizationChanged = (event: Event) => {
      const change = taskOrganizationChangeFromEvent(event)
      if (!change) return

      loadVersion.current++
      setTasks((current) =>
        current?.map((task) =>
          applyTaskOrganizationChange(task, lists, change),
        ) ?? null,
      )
    }

    const interval = window.setInterval(refreshCalendar, 60_000)
    refreshCalendar()
    const onVisibility = () => {
      if (!document.hidden) refreshTasks()
    }

    window.addEventListener(TASKS_CHANGED, handleTasksChanged)
    window.addEventListener(EVENTS_CHANGED, handleEventsChanged)
    window.addEventListener(LISTS_CHANGED, handleListsChanged)
    window.addEventListener(CATEGORIES_CHANGED, handleCategoriesChanged)
    window.addEventListener(TASK_ORGANIZATION_CHANGED, organizationChanged)
    window.addEventListener('focus', refreshTasks)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener(TASKS_CHANGED, handleTasksChanged)
      window.removeEventListener(EVENTS_CHANGED, handleEventsChanged)
      window.removeEventListener(LISTS_CHANGED, handleListsChanged)
      window.removeEventListener(CATEGORIES_CHANGED, handleCategoriesChanged)
      window.removeEventListener(
        TASK_ORGANIZATION_CHANGED,
        organizationChanged,
      )
      window.removeEventListener('focus', refreshTasks)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [lists, load])

  const homeSources = useMemo(() => getHomeSources(lists), [lists])
  const uncategorizedListIds = useMemo(
    () => new Set([
      ...(tasks ?? [])
        .filter((task) => task.list_id !== null && task.category_id == null)
        .map((task) => task.list_id as string),
      ...upcomingEvents
        .filter((event) => event.list_id !== null && event.category_id == null)
        .map((event) => event.list_id as string),
    ]),
    [tasks, upcomingEvents],
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
    () => filterHomeTasks(tasks ?? [], homePreferences, categories).filter((task) => {
      if (!task.recurrence_rule) return true
      return currentOccurrences.some((occurrence) => occurrence.task_id === task.id && !occurrence.completed && !occurrence.skipped)
    }),
    [categories, currentOccurrences, homePreferences, tasks],
  )

  const filteredDefinitions = useMemo(
    () => filterHomeTasks(tasks ?? [], homePreferences, categories).filter((task) => matchesTaskSearch(task, searchQuery)),
    [categories, homePreferences, searchQuery, tasks],
  )

  const filteredTasks = useMemo(
    () => homeTasks.filter((task) => matchesTaskSearch(task, searchQuery)),
    [homeTasks, searchQuery],
  )
  const creationView: TaskCreationView = {
    type: 'home', preferences: homePreferences, categories, searchQuery,
  }

  const buckets = useMemo(() => {
    const homeBuckets = getHomeBuckets(filteredTasks, day)

    return {
      focus: sortTasks(homeBuckets.focus, sortOption),
      dueSoon: sortTasks(homeBuckets.dueSoon, sortOption),
      tasks: sortTasks(homeBuckets.tasks, sortOption),
      stashed: sortTasks(homeBuckets.stashed, sortOption),
    }
  }, [day, filteredTasks, sortOption])

  const upcoming = useMemo(() => {
    const upcomingEnd = addCalendarDays(day, HOME_UPCOMING_DAYS)
    const taskEntries: UpcomingTaskEntry[] = []
    const taskOrder = new Map(
      sortTasks(
        filteredDefinitions.filter((task) => !task.completed && !task.stashed),
        sortOption,
      )
        .map((task, index) => [task.id, index]),
    )

    for (const task of filteredDefinitions) {
      if (task.completed || task.stashed) continue

      const current = task.recurrence_rule
        ? currentOccurrences.find((occurrence) => occurrence.task_id === task.id)
        : null
      const dateKey = task.recurrence_rule
        ? current && !current.completed && !current.skipped
          ? day
          : nextOccurrenceDate(task.recurrence_rule, day)
        : task.due_date
      if (!dateKey || dateKey >= upcomingEnd) continue

      const section = upcomingSectionForDate(dateKey, day)
      const time = formatUpcomingTime(task.due_time)
      taskEntries.push({
        kind: 'task',
        task,
        section,
        label: section === 'overdue'
          ? formatOverdueLabel(dateKey, day)
          : section === 'today'
            ? 'Today'
            : formatUpcomingDay(dateKey),
        time,
        sortKey: `${dateKey}T${task.due_time ?? '23:59:59'}`,
        tieBreak: taskOrder.get(task.id) ?? 0,
      })
    }

    // The clock effect runs immediately after the first client render. Until
    // then, keep timed events out rather than treating every instant as future.
    const now = currentTime ?? Number.POSITIVE_INFINITY
    const eventSeries = new Map<string, CalendarEventWithList>()
    for (const event of filterHomeEvents(upcomingEvents, homePreferences, categories)) {
      const parts = eventLocalParts(event)
      const startsOn = event.all_day ? event.starts_on : parts.date
      const start = event.starts_at ? Date.parse(event.starts_at) : Number.NaN
      const end = event.ends_at ? Date.parse(event.ends_at) : Number.NaN
      const isOngoing = event.all_day
        ? Boolean(event.starts_on && event.ends_on && event.starts_on < day && event.ends_on > day)
        : Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end > now)
      const isUpcoming = event.all_day
        ? Boolean(startsOn && startsOn >= day && startsOn < upcomingEnd)
        : Number.isFinite(start) && start >= now && Boolean(startsOn && startsOn < upcomingEnd)
      if (!isOngoing && !isUpcoming) continue

      const seriesId = event.source_event_id ?? event.id
      const existing = eventSeries.get(seriesId)
      if (!existing) {
        eventSeries.set(seriesId, event)
        continue
      }

      const eventSortKey = event.all_day
        ? `${event.starts_on ?? '9999-12-31'}T00:00`
        : event.starts_at ?? '9999-12-31T23:59:59.999Z'
      const existingSortKey = existing.all_day
        ? `${existing.starts_on ?? '9999-12-31'}T00:00`
        : existing.starts_at ?? '9999-12-31T23:59:59.999Z'
      if (eventSortKey < existingSortKey) eventSeries.set(seriesId, event)
    }
    const eventEntries: UpcomingEventEntry[] = Array.from(eventSeries.values()).flatMap((event, index) => {
      const parts = eventLocalParts(event)
      const startsOn = event.all_day ? event.starts_on : parts.date
      const time = event.all_day ? null : parts.time
      const displayDate = startsOn && startsOn < day ? day : startsOn
      if (!displayDate || displayDate >= upcomingEnd) return []
      const section = upcomingSectionForDate(displayDate, day)
      return [{
        kind: 'event' as const,
        event,
        section,
        label: section === 'today' ? 'Today' : formatUpcomingDay(displayDate),
        time,
        sortKey: `${displayDate}T${time ?? '00:00'}`,
        tieBreak: filteredDefinitions.length + index,
      }]
    })
    return [...taskEntries, ...eventEntries]
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey) || left.tieBreak - right.tieBreak)
  }, [categories, currentOccurrences, currentTime, day, filteredDefinitions, homePreferences, sortOption, upcomingEvents])

  const hasVisibleHomeTasks = Object.values(buckets).some((bucket) => bucket.length > 0) || upcoming.length > 0 || attention.length > 0

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
    const previousOccurrences = currentOccurrences
    const task = tasks?.find((candidate) => candidate.id === taskId)
    const recurringCompletion = completed && Boolean(task?.recurrence_rule)

    if (completed && !recurringCompletion) {
      if (exitingTaskIds.has(taskId)) return

      setExitingTaskIds((current) => {
        const next = new Set(current)
        next.add(taskId)
        return next
      })
    } else {
      updateTask(taskId, { completed: recurringCompletion ? false : completed })
    }
    if (recurringCompletion) {
      setCurrentOccurrences((current) => current.map((occurrence) =>
        occurrence.task_id === taskId && occurrence.occurrence_date === localDateKey()
          ? { ...occurrence, completed: true }
          : occurrence,
      ))
    }

    try {
      const result = await updateTaskCompletedAction(taskId, completed, localDateKey())

      if (result.recurring && !result.taskCompleted) {
        updateTask(taskId, { completed: false })
      } else if (completed) {
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
      setCurrentOccurrences(previousOccurrences)
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

  async function handleSkipAttentionSession(item: NeedsAttentionItem) {
    if (!item.session?.id) return
    try {
      await skipTimeBlock(item.session.id)
      notifyTasksChanged()
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Session could not be skipped.')
    }
  }

  async function handleSkipAttentionOccurrence(occurrence: TaskOccurrence) {
    try {
      await updateTaskOccurrenceSkipped(occurrence.id, true)
      notifyTasksChanged()
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Occurrence could not be skipped.')
    }
  }

  function renderTask(task: TaskWithList, deadlineLabel?: string | null, deadlineTime?: string | null) {
    return (
      <HomeTaskRow
        key={task.id}
        task={task}
        lists={lists}
        categories={categories}
        deadlineLabel={deadlineLabel === undefined ? getDeadlineLabel(task.due_date, day) : deadlineLabel}
        deadlineTime={deadlineTime === undefined ? getDueTimeLabel(task.due_time) : deadlineTime}
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

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div
        ref={scrollRootRef}
        className="min-h-0 flex-1 overflow-y-auto bg-background px-4 pb-5 pt-0 sm:px-6 sm:pb-6 sm:pt-8 lg:px-8"
      >
        <CollapsiblePageHeader
          headerTitle="Home"
          taskCount={activeCount}
          scrollRootRef={scrollRootRef}
          rightSlot={(isCollapsed) => (
            <CreateTaskAction
              creationView={creationView}
              lists={lists}
              categories={categories}
              listId={null}
              compact
              interactive={isCollapsed}
            />
          )}
        >
          <div className="home-workspace-container mx-auto w-full max-w-360">
            <div className="home-large-header mb-3 flex min-w-0 flex-col gap-3 pb-1 pt-2 sm:pb-2 sm:pt-3">
              <div className="home-title-row flex min-w-0 items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-1">
                  <SidebarTrigger className="mt-1 md:hidden" />
                  <h1 className="max-w-full min-w-0 font-heading text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em] text-foreground">
                    {formattedDay}
                  </h1>
                </div>
                <AgendaToggle />
              </div>
              <div className="home-header-meta flex min-w-0 flex-col gap-4">
                <p className="home-header-message max-w-[42rem] text-base text-slate-500 dark:text-muted-foreground sm:text-lg">
                  {message}
                </p>
                <div className="home-toolbar grid w-full min-w-0 items-center gap-2">
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
                  <div className="home-task-sort flex min-w-0 items-center justify-self-start">
                    <TaskSortSelect
                      value={sortOption}
                      onValueChange={handleSortChange}
                      iconOnlyOnMobile
                    />
                  </div>
                  <label
                    className="home-task-search relative min-w-0 w-full"
                    aria-label="Search tasks"
                  >
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search tasks..."
                      className="h-9 w-full min-w-0 rounded-xl border-slate-200/90 bg-white/80 pl-9 shadow-[0_6px_20px_rgba(62,84,120,0.05)] dark:border-input dark:bg-surface dark:shadow-none"
                    />
                  </label>
                  <CreateTaskAction
                    creationView={creationView}
                    lists={lists}
                    categories={categories}
                    listId={null}
                    className="home-add-task-action"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsiblePageHeader>

        <div className="home-workspace-container mx-auto w-full max-w-360">
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
            <div className="space-y-5" aria-label="Loading Home">
              <Skeleton className="h-40 w-full rounded-[20px]" />
              <Skeleton className="h-48 w-full rounded-[20px]" />
              <Skeleton className="h-56 w-full rounded-[20px]" />
            </div>
          )}

          {tasks && (
            <div className="space-y-3">
              {enabledHomeSourceCount === 0 && !hasVisibleHomeTasks ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-6 text-center shadow-[0_6px_18px_rgba(62,84,120,0.04)] dark:border-blue-400/25 dark:bg-blue-500/10 dark:shadow-none">
                  <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-foreground">
                    Nothing is shown on Home
                  </h2>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-muted-foreground">
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
                <div className="home-task-layout">
                  <aside aria-label="Attention" className="home-attention-rail">
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

                    <UpcomingSection
                      entries={upcoming}
                      expanded={upcomingExpanded}
                      onExpandedChange={setUpcomingExpanded}
                      lists={lists}
                      categories={categories}
                      onComplete={handleComplete}
                      onRename={handleRename}
                      onDueDateChange={handleDueDateChange}
                      onNotesChange={handleNotesChange}
                      onDelete={handleDelete}
                      onFocus={handleFocus}
                      onStash={handleStash}
                      exitingTaskIds={exitingTaskIds}
                      onOpenEvent={setEditingEvent}
                    />

                  </aside>

                  <div className="home-task-main">
                    <SectionShell
                      title="Tasks"
                      count={buckets.tasks.length}
                      icon={<ListTodo className="size-5" />}
                      tone="tasks"
                      leadingContent={
                        <NeedsAttentionSection
                          items={attention}
                          lists={lists}
                          categories={categories}
                          onComplete={handleComplete}
                          onRename={handleRename}
                          onDueDateChange={handleDueDateChange}
                          onNotesChange={handleNotesChange}
                          onDelete={handleDelete}
                          onFocus={handleFocus}
                          onStash={handleStash}
                          onSkipSession={handleSkipAttentionSession}
                          onSkipOccurrence={handleSkipAttentionOccurrence}
                        />
                      }
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
                      className="mt-3 overflow-hidden rounded-2xl border border-slate-300/70 bg-slate-100/70 shadow-[0_6px_18px_rgba(62,84,120,0.04)] dark:border-border dark:bg-surface dark:shadow-none"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                          {stashedOpen ? (
                            <PackageOpen className="size-5 text-slate-600 dark:text-text-tertiary" />
                          ) : (
                            <Package className="size-5 text-slate-600 dark:text-text-tertiary" />
                          )}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            Stashed
                          </span>
                          <span className="flex size-6 items-center justify-center rounded-full bg-slate-200/80 text-[11px] font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">
                            {buckets.stashed.length}
                          </span>
                          <ChevronDown
                            className={`ml-auto size-4 text-slate-500 transition-transform dark:text-text-tertiary ${stashedOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                        {buckets.stashed.length > 0 ? (
                          <ul className="overflow-hidden rounded-[15px] border border-slate-200/80 bg-white/90 divide-y divide-slate-200/80 dark:border-border dark:bg-surface-elevated dark:divide-border/80">
                            {buckets.stashed.map((task) => renderTask(task))}
                          </ul>
                        ) : (
                          <div className="rounded-[15px] border border-dashed border-slate-300/70 bg-white/55 px-5 py-6 text-center text-sm text-slate-500 dark:border-border dark:bg-surface/60 dark:text-muted-foreground">
                            Nothing is stashed right now.
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    {editingEvent ? <EventDialog lists={lists} categories={categories} event={editingEvent} open onOpenChange={(open) => { if (!open) setEditingEvent(null) }} /> : null}
    </>
  )
}
