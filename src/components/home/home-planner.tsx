'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
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
  Plus,
  Repeat,
  Search,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { localDateKey } from '@/lib/today'
import {
  getHomeUpcomingEntries,
  UPCOMING_SECTION_LABELS,
  type UpcomingEntry,
  type UpcomingTaskEntry,
  type UpcomingEventEntry,
  type UpcomingSectionKey,
} from '@/lib/home-upcoming'
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
import { eventColorStyle } from '@/lib/list-colors'
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
import { useAgenda } from '@/components/agenda/agenda-provider'
import { setHomeAgendaTarget } from '@/components/agenda/home-agenda-target'
import {
  TaskItem,
  waitForTaskExit,
} from '@/components/tasks/task-item/task-item'
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

type HomeData = Awaited<ReturnType<typeof getHomeData>>
type HomeTaskDragSource = 'focus' | 'upcoming' | 'tasks'
type HomeRightPanel = 'focus' | 'upcoming' | 'agenda'

const HOME_RIGHT_PANELS: HomeRightPanel[] = ['focus', 'upcoming', 'agenda']
const AGENDA_DOCKED_QUERY = '(min-width: 1280px)'

function subscribeToAgendaDocked(listener: () => void) {
  const query = window.matchMedia(AGENDA_DOCKED_QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function getAgendaDockedSnapshot() {
  return window.matchMedia(AGENDA_DOCKED_QUERY).matches
}

const HOME_SORT_STORAGE_KEY = 'planomy:home-sort'

const OPENING_MESSAGES = [
  'Let’s make a little room for what matters. ✨',
  'A clear place to begin. You’ve got this. 🌤️',
  'Pick a thread and make it lighter. ✨',
  'Your next right thing is waiting here. 🌱',
  'Small steps count today. Let’s start there. ✨',
]

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

const HOME_WIDGET_STATUS_PILL_CLASS =
  'inline-flex max-w-28 truncate rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums sm:max-w-none sm:text-[11px]'

const HOME_WIDGET_CARD_CLASS =
  'overflow-hidden rounded-xl border border-yellow-100/80 bg-yellow-50/65 p-2.5 dark:border-border dark:bg-surface'

const HOME_NEEDS_ATTENTION_CARD_CLASS =
  'overflow-hidden rounded-xl border border-amber-300/80 border-l-4 border-l-amber-500 bg-amber-50/90 p-2.5 shadow-sm shadow-amber-950/5 dark:border-amber-400/25 dark:border-l-amber-300/80 dark:bg-amber-500/10 dark:shadow-none'

const HOME_NEEDS_ATTENTION_COUNT_CLASS =
  'flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-amber-300/70 bg-amber-200/70 px-1.5 text-[10px] font-semibold tabular-nums text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/15 dark:text-amber-100'

const HOME_WIDGET_HEADER_CLASS =
  'group flex min-w-0 items-center gap-2 px-0.5 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

const HOME_WIDGET_COUNT_CLASS =
  'flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] px-1.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:border dark:border-border-subtle dark:bg-surface-hover dark:text-text-secondary'

const HOME_WIDGET_CHEVRON_CLASS =
  'ml-auto size-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-muted-foreground motion-reduce:transition-none'

const HOME_WIDGET_EMPTY_CLASS =
  'rounded-lg border border-dashed border-slate-300/70 bg-white/55 px-4 py-4 text-center text-sm text-slate-500 dark:border-border dark:bg-surface/60 dark:text-muted-foreground'

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
  dragSource?: HomeTaskDragSource
  isAgendaBusy: boolean
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
  dragSource,
  isAgendaBusy,
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
      homeWidgetStyle
      wholeRowDraggable={Boolean(dragSource)}
      dragId={dragSource ? `home-agenda:${dragSource}:${task.id}` : undefined}
      dragScope={dragSource ? 'home' : undefined}
      dragDisabled={task.completed || isExiting || isAgendaBusy}
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
      dense
      trailingActions={
        <div className="flex items-center gap-1.5">
          {deadlineLabel && (
            <span
              className={`${HOME_WIDGET_STATUS_PILL_CLASS} ${getDeadlineBadgeClassName(deadlineLabel)}`}
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
              ? 'h-7 w-7 shrink-0 cursor-pointer text-yellow-400 hover:text-yellow-500 dark:text-kanban-board-circle-yellow dark:hover:text-yellow-300'
              : 'h-7 w-7 shrink-0 cursor-pointer text-slate-400 dark:text-muted-foreground'
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
  showRescheduleAction = false,
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
  showRescheduleAction?: boolean
}) {
  const displayTask = isExiting ? { ...entry.task, completed: true } : entry.task
  const { busy } = useAgenda()
  const taskBusy = busy.has(entry.task.id)
  const status = entry.section === 'overdue'
    ? entry.label
    : entry.section === 'today'
      ? entry.time ?? ''
      : `${entry.label}${entry.time ? ` · ${entry.time}` : ''}`

  return (
    <TaskItem
      task={displayTask}
      lists={lists}
      categories={categories}
      currentListId={null}
      highlighted={false}
      shouldHideCompleted
      isInbox={false}
      canReorder={false}
      wholeRowDraggable
      dragId={`home-agenda:upcoming:${entry.task.id}`}
      dragScope="home"
      dragDisabled={displayTask.completed || isExiting || taskBusy}
      homeWidgetStyle
      showDueDate={false}
      showAddToList
      showCategory
      isExiting={isExiting}
      dense
      handleOnComplete={onComplete}
      handleOnRename={onRename}
      handleOnDueDateChange={onDueDateChange}
      handleOnNotesChange={onNotesChange}
      handleOnDelete={onDelete}
      handleOnFocus={onFocus}
      handleOnStash={onStash}
      trailingActions={
        <div className="flex items-center gap-1.5">
          {showRescheduleAction ? (
            <TaskEditDialog
              task={displayTask}
              lists={lists}
              categories={categories}
              currentListId={displayTask.list_id}
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 rounded-lg px-2 text-[11px]"
                aria-label={`Reschedule ${entry.task.title}`}
                disabled={taskBusy || isExiting}
              >
                Reschedule
              </Button>
            </TaskEditDialog>
          ) : null}
          {status ? (
            <span
              className={`${HOME_WIDGET_STATUS_PILL_CLASS} ${getUpcomingPillClassName(entry.section)}`}
            >
              {status}
            </span>
          ) : null}
          {!displayTask.stashed && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={displayTask.focused ? 'Remove from Focus' : 'Add to Focus'}
              aria-label={displayTask.focused ? 'Remove from Focus' : 'Add to Focus'}
              aria-pressed={displayTask.focused}
              onClick={() => onFocus(displayTask.id, !displayTask.focused)}
              className={
                displayTask.focused
                  ? 'h-7 w-7 shrink-0 cursor-pointer text-yellow-400 hover:text-yellow-500 dark:text-kanban-board-circle-yellow dark:hover:text-yellow-300'
                  : 'h-7 w-7 shrink-0 cursor-pointer text-slate-400 dark:text-muted-foreground'
              }
            >
              <Star className={displayTask.focused ? 'fill-current' : undefined} />
            </Button>
          )}
        </div>
      }
    />
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
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 px-0 py-1.5">
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
          <span className={`${HOME_WIDGET_STATUS_PILL_CLASS} ${getUpcomingPillClassName(entry.section)}`}>
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

  const groups = (Object.keys(UPCOMING_SECTION_LABELS) as UpcomingSectionKey[])
    .map((key) => ({
      key,
      title: UPCOMING_SECTION_LABELS[key],
      entries: entries.filter((entry) => entry.section === key),
    }))
    .filter((group) => group.entries.length > 0)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`upcoming-panel ${HOME_WIDGET_CARD_CLASS}`}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`${HOME_WIDGET_HEADER_CLASS} w-full`}
          aria-label={`${open ? 'Collapse' : 'Expand'} Upcoming`}
        >
          <Clock3 className="size-4.5 shrink-0 text-yellow-600 dark:text-yellow-200" strokeWidth={1.8} aria-hidden="true" />
          <span className="min-w-0 truncate font-heading text-sm font-semibold tracking-[-0.01em]">Upcoming</span>
          <span className={HOME_WIDGET_COUNT_CLASS}>
            {entries.length}
          </span>
          <ChevronDown
            className={`${HOME_WIDGET_CHEVRON_CLASS} ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-0.5">
          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              className={groupIndex > 0 ? 'border-t border-border/70 pt-2' : 'pt-1.5'}
            >
              <h2 className={`text-[11px] font-medium uppercase leading-4 tracking-[0.04em] ${group.key === 'today' ? 'font-semibold text-foreground' : group.key === 'overdue' ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground'}`}>
                {group.title}
              </h2>
              <ul className="mt-0.5 divide-y divide-border/65">
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
      </CollapsibleContent>
    </Collapsible>
  )
}

type SectionShellProps = {
  title: string
  count: number
  countLabel?: ReactNode
  icon: ReactNode
  iconClassName?: string
  children: ReactNode
  empty: ReactNode
  compactWhenEmpty?: boolean
  compactEmptyLabel?: string
  headerAction?: ReactNode
  footerContent?: ReactNode
}

function SectionShell({
  title,
  count,
  countLabel,
  icon,
  iconClassName = 'text-blue-700 dark:text-text-secondary',
  children,
  empty,
  compactWhenEmpty = false,
  compactEmptyLabel,
  headerAction,
  footerContent,
}: SectionShellProps) {
  const [open, setOpen] = useState(true)
  const compactEmpty = count === 0 && compactWhenEmpty

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={HOME_WIDGET_CARD_CLASS}
    >
      <h2 className="mb-1 flex min-w-0 items-center gap-2 px-0.5 py-0.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
            className={`${HOME_WIDGET_HEADER_CLASS} flex-1`}
          >
            <span className={`shrink-0 ${iconClassName}`}>
              {icon}
            </span>
            <span className="min-w-0 truncate font-heading text-sm font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </span>
            <span className={HOME_WIDGET_COUNT_CLASS}>
              {countLabel ?? count}
            </span>
            {compactEmpty ? (
              <span
                className="min-w-0 flex-1 truncate text-xs font-normal text-slate-500 dark:text-muted-foreground"
                title={compactEmptyLabel}
              >
                {compactEmptyLabel}
              </span>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className={`${HOME_WIDGET_CHEVRON_CLASS} ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        {headerAction}
      </h2>
      <CollapsibleContent>
        {count > 0 ? (
          <>
            <ul className="mt-0.5 divide-y divide-border/65">
              {children}
            </ul>
            {footerContent}
          </>
        ) : compactEmpty ? null : (
          <div className={HOME_WIDGET_EMPTY_CLASS}>
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

type NeedsAttentionRow =
  | { kind: 'overdue-task'; entry: UpcomingTaskEntry }
  | { kind: 'missed-item'; item: NeedsAttentionItem }

function NeedsAttentionSection({
  items,
  overdueTasks,
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
  exitingTaskIds,
}: {
  items: NeedsAttentionItem[]
  overdueTasks: UpcomingTaskEntry[]
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
  exitingTaskIds: Set<string>
}) {
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const overdueTasksById = new Map(
    overdueTasks.map((entry) => [entry.task.id, entry]),
  )
  const attentionTaskIds = new Set(items.map((item) => item.task.id))
  const additionalOverdueTasks = overdueTasks.filter(
    (entry) => !attentionTaskIds.has(entry.task.id),
  )
  const rows: NeedsAttentionRow[] = [
    ...additionalOverdueTasks.map((entry) => ({ kind: 'overdue-task' as const, entry })),
    ...items.map((item) => ({ kind: 'missed-item' as const, item })),
  ]
  const unresolvedCount = items.reduce(
    (count, item) => count + (item.kind === 'missed-session' ? 1 : item.occurrences.length),
    additionalOverdueTasks.length,
  )
  const visibleRows = showAll ? rows : rows.slice(0, 4)

  if (!rows.length) return null

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={HOME_NEEDS_ATTENTION_CARD_CLASS}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`${HOME_WIDGET_HEADER_CLASS} w-full`}
          aria-label={`${open ? 'Collapse' : 'Expand'} Needs Attention`}
        >
          <AlertTriangle className="size-4.5 shrink-0 text-amber-600 dark:text-amber-300" />
          <span className="min-w-0 truncate font-heading text-sm font-semibold tracking-[-0.01em]">
            Needs Attention
          </span>
          <span className={HOME_NEEDS_ATTENTION_COUNT_CLASS}>
            {unresolvedCount}
          </span>
          <ChevronDown className={`ml-auto size-4 shrink-0 text-amber-700/80 transition-transform duration-200 dark:text-amber-200/80 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5">
        <ul className="divide-y divide-amber-300/50 dark:divide-amber-300/10">
          {visibleRows.map((row) => {
            if (row.kind === 'overdue-task') {
              return (
                <UpcomingTaskRow
                  key={`overdue:${row.entry.task.id}`}
                  entry={row.entry}
                  lists={lists}
                  categories={categories}
                  onComplete={onComplete}
                  onRename={onRename}
                  onDueDateChange={onDueDateChange}
                  onNotesChange={onNotesChange}
                  onDelete={onDelete}
                  onFocus={onFocus}
                  onStash={onStash}
                  isExiting={exitingTaskIds.has(row.entry.task.id)}
                  showRescheduleAction
                />
              )
            }

            const item = row.item
            return (
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
                homeWidgetStyle
                showDueDate={false}
                showAddToList
                compact
                dense
                handleOnComplete={onComplete}
                handleOnRename={onRename}
                handleOnDueDateChange={onDueDateChange}
                handleOnNotesChange={onNotesChange}
                handleOnDelete={onDelete}
                handleOnFocus={onFocus}
                handleOnStash={onStash}
                leadingBadge={
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700/80 dark:text-amber-200/80">
                      {item.kind === 'missed-occurrence' ? <Repeat className="size-3.5 shrink-0" /> : <Clock3 className="size-3.5 shrink-0" />}
                      {attentionDateLabel(item)}
                    </span>
                    {overdueTasksById.has(item.task.id) ? (
                      <span className={`${HOME_WIDGET_STATUS_PILL_CLASS} border-destructive/20 bg-destructive/8 text-destructive`}>
                        Overdue
                      </span>
                    ) : null}
                  </div>
                }
                trailingActions={
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <TaskEditDialog
                      task={item.task}
                      lists={lists}
                      categories={categories}
                      currentListId={item.task.list_id}
                      focusPlanTime
                      occurrence={attentionOccurrence(item)}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        aria-label={`Reschedule ${item.task.title}`}
                      >
                        Reschedule
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
            )
          })}
        </ul>
        {rows.length > 4 ? (
          <Button type="button" variant="ghost" size="sm" className="mt-1.5 h-7 px-1.5 text-xs text-muted-foreground" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Show less' : `Show ${rows.length - 4} more`}
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
  const {
    busy: agendaBusy,
    open: agendaOpen,
    setOpen: setAgendaOpen,
  } = useAgenda()
  const agendaDocked = useSyncExternalStore(
    subscribeToAgendaDocked,
    getAgendaDockedSnapshot,
    () => false,
  )
  const [selectedRightPanel, setSelectedRightPanel] = useState<HomeRightPanel>('focus')
  const activeRightPanel = agendaOpen ? 'agenda' : selectedRightPanel === 'agenda' ? 'focus' : selectedRightPanel
  const compactView = agendaOpen ? 'agenda' : 'tasks'
  const [day, setDay] = useState(() => localDateKey())
  const dayRef = useRef(day)
  const [tasks, setTasks] = useState<TaskWithList[] | null>(null)
  const [currentOccurrences, setCurrentOccurrences] = useState<TaskOccurrence[]>([])
  const [attention, setAttention] = useState<NeedsAttentionItem[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventWithList[]>([])
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithList | null>(null)
  const [focusPickerOpen, setFocusPickerOpen] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [homePreferences, setHomePreferences] = useState<HomeSourcePreferences>(
    () => initialData.homePreferences,
  )
  const [currentTime, setCurrentTime] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<TaskSortOption>('manual')
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [stashedOpen, setStashedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const loadVersion = useRef(0)
  const homePreferenceSaveQueue = useRef(Promise.resolve())
  const homePreferenceChangeVersion = useRef(0)

  function selectRightPanel(panel: HomeRightPanel) {
    if (panel === 'agenda') {
      setAgendaOpen(true)
      return
    }

    setSelectedRightPanel(panel)
    setAgendaOpen(false)
  }

  function handleRightPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const focusedTab = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[role="tab"]')
      : null
    const focusedPanel = HOME_RIGHT_PANELS.find(
      (panel) => focusedTab?.id === `home-right-tab-${panel}`,
    )
    const currentIndex = HOME_RIGHT_PANELS.indexOf(focusedPanel ?? activeRightPanel)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % HOME_RIGHT_PANELS.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + HOME_RIGHT_PANELS.length - 1) % HOME_RIGHT_PANELS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = HOME_RIGHT_PANELS.length - 1
    else return

    event.preventDefault()
    const nextPanel = HOME_RIGHT_PANELS[nextIndex]
    selectRightPanel(nextPanel)
    document.getElementById(`home-right-tab-${nextPanel}`)?.focus()
  }

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
  const focusCandidates = useMemo(
    () => filteredTasks.filter((task) => !task.completed && !task.stashed && !task.focused),
    [filteredTasks],
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
    return getHomeUpcomingEntries({
      tasks: filteredDefinitions,
      orderedTasks: sortTasks(filteredDefinitions, sortOption),
      currentOccurrences,
      upcomingEvents,
      categories,
      preferences: homePreferences,
      day,
      currentTime,
    })
  }, [categories, currentOccurrences, currentTime, day, filteredDefinitions, homePreferences, sortOption, upcomingEvents])
  const overdueTaskEntries = useMemo(
    () => upcoming.filter(
      (entry): entry is UpcomingTaskEntry =>
        entry.kind === 'task' && entry.section === 'overdue',
    ),
    [upcoming],
  )
  const todayEntries = useMemo(
    () => upcoming.filter((entry) => entry.section === 'today'),
    [upcoming],
  )
  const otherUpcomingEntries = useMemo(
    () => upcoming.filter(
      (entry) =>
        entry.section !== 'today' &&
        !(entry.kind === 'task' && entry.section === 'overdue'),
    ),
    [upcoming],
  )
  const hasNeedsAttention = attention.length > 0 || overdueTaskEntries.length > 0

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

  function renderTask(
    task: TaskWithList,
    deadlineLabel?: string | null,
    deadlineTime?: string | null,
    dragSource?: HomeTaskDragSource,
  ) {
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
        dragSource={dragSource}
        isAgendaBusy={agendaBusy.has(task.id)}
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
            <div className="home-large-header mb-2 flex min-w-0 flex-col gap-3 pt-2 sm:pt-3">
              <div className="home-title-row flex min-w-0 items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-1">
                  <SidebarTrigger className="mt-1 md:hidden" />
                  <h1 className="max-w-full min-w-0 font-heading text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em] text-foreground">
                    {formattedDay}
                  </h1>
                </div>
                <div className="home-agenda-toggle">
                  <AgendaToggle />
                </div>
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
                <div className="home-task-layout" data-compact-view={compactView}>
                  {hasNeedsAttention ? (
                    <div className="home-needs-attention">
                      <NeedsAttentionSection
                        items={attention}
                        overdueTasks={overdueTaskEntries}
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
                        exitingTaskIds={exitingTaskIds}
                      />
                    </div>
                  ) : null}
                  <div
                    role="group"
                    aria-label="Home view"
                    className="home-compact-view-toggle"
                  >
                    <button
                      type="button"
                      className="home-compact-view-button"
                      aria-pressed={!agendaOpen}
                      aria-controls="home-task-main"
                      onClick={() => setAgendaOpen(false)}
                    >
                      <ListTodo aria-hidden="true" className="size-4" />
                      <span>Tasks</span>
                    </button>
                    <button
                      type="button"
                      className="home-compact-view-button"
                      data-agenda-toggle
                      aria-pressed={agendaOpen}
                      aria-controls="home-right-panel-agenda"
                      onClick={() => setAgendaOpen(true)}
                    >
                      <CalendarFold aria-hidden="true" className="size-4" />
                      <span>Agenda</span>
                    </button>
                  </div>
                  <aside aria-label="Home panels" className="home-attention-rail">
                    <div
                      role="tablist"
                      aria-label="Home widgets"
                      className="home-right-tabs"
                      hidden={agendaDocked}
                      onKeyDown={handleRightPanelKeyDown}
                    >
                      {HOME_RIGHT_PANELS.map((panel) => {
                        const selected = activeRightPanel === panel
                        const label = panel === 'focus' ? 'Focus' : panel === 'upcoming' ? 'Upcoming' : 'Agenda'
                        const Icon = panel === 'focus' ? Star : panel === 'upcoming' ? Clock3 : CalendarFold

                        return (
                          <button
                            key={panel}
                            id={`home-right-tab-${panel}`}
                            type="button"
                            role="tab"
                            data-agenda-toggle={panel === 'agenda' ? true : undefined}
                            aria-selected={selected}
                            aria-controls={`home-right-panel-${panel}`}
                            tabIndex={selected ? 0 : -1}
                            className="home-right-tab"
                            onClick={() => selectRightPanel(panel)}
                          >
                            <Icon aria-hidden="true" className="size-4 shrink-0" />
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="home-right-panes">
                      <div
                        id="home-right-panel-focus"
                        role={agendaDocked ? undefined : 'tabpanel'}
                        aria-labelledby={agendaDocked ? undefined : 'home-right-tab-focus'}
                        tabIndex={agendaDocked ? undefined : 0}
                        data-home-right-pane="focus"
                        hidden={!agendaDocked && activeRightPanel !== 'focus'}
                      >
                        <SectionShell
                          title="Focus"
                          count={buckets.focus.length}
                          countLabel={`${buckets.focus.length}/${MAX_FOCUS_TASKS}`}
                          icon={<Star className="size-4.5" />}
                          iconClassName="text-blue-600 dark:text-accent"
                          empty="Pick up to three tasks to keep close today."
                          compactWhenEmpty
                          compactEmptyLabel="Choose up to 3 tasks to focus on"
                          headerAction={buckets.focus.length < MAX_FOCUS_TASKS ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0 gap-1 rounded-lg px-2 text-xs"
                              onClick={() => setFocusPickerOpen(true)}
                            >
                              <Plus aria-hidden="true" />
                              Add
                            </Button>
                          ) : null}
                        >
                          {buckets.focus.map((task) => renderTask(task, undefined, undefined, 'focus'))}
                        </SectionShell>
                      </div>

                      <div
                        id="home-right-panel-upcoming"
                        role={agendaDocked ? undefined : 'tabpanel'}
                        aria-labelledby={agendaDocked ? undefined : 'home-right-tab-upcoming'}
                        tabIndex={agendaDocked ? undefined : 0}
                        data-home-right-pane="upcoming"
                        hidden={!agendaDocked && activeRightPanel !== 'upcoming'}
                      >
                        <UpcomingSection
                          entries={otherUpcomingEntries}
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
                      </div>

                      <div
                        id="home-right-panel-agenda"
                        role={agendaDocked ? undefined : 'tabpanel'}
                        aria-labelledby={agendaDocked ? undefined : 'home-right-tab-agenda'}
                        tabIndex={agendaDocked ? undefined : 0}
                        data-home-right-pane="agenda"
                        hidden={agendaDocked || activeRightPanel !== 'agenda'}
                      >
                        <div
                          ref={setHomeAgendaTarget}
                          id="home-agenda-tab-target"
                          className="home-agenda-tab-target"
                        />
                      </div>
                    </div>
                  </aside>

                  <div className="home-task-main" id="home-task-main">
                    <SectionShell
                      title="Tasks"
                      count={buckets.tasks.length + todayEntries.length}
                      icon={<ListTodo className="size-4.5" />}
                      iconClassName="text-blue-700 dark:text-text-secondary"
                      empty={
                        searchQuery
                          ? 'No tasks match that search.'
                          : 'Everything is captured. Enjoy the clear space.'
                      }
                    >
                      {todayEntries.length > 0 ? (
                        <li className="list-none px-0.5 py-1">
                          <section aria-label="Today">
                            <h3 className="font-heading text-sm font-semibold leading-5 tracking-[-0.01em] text-foreground">
                              Today
                            </h3>
                            <ul className="mt-1 divide-y divide-border/65">
                              {todayEntries.map((entry) => entry.kind === 'task' ? (
                                <UpcomingTaskRow
                                  key={entry.task.id}
                                  entry={entry}
                                  lists={lists}
                                  categories={categories}
                                  onComplete={handleComplete}
                                  onRename={handleRename}
                                  onDueDateChange={handleDueDateChange}
                                  onNotesChange={handleNotesChange}
                                  onDelete={handleDelete}
                                  onFocus={handleFocus}
                                  onStash={handleStash}
                                  isExiting={exitingTaskIds.has(entry.task.id)}
                                />
                              ) : (
                                <UpcomingEventRow
                                  key={entry.event.id}
                                  entry={entry}
                                  categories={categories}
                                  onOpen={() => setEditingEvent(entry.event)}
                                />
                              ))}
                            </ul>
                          </section>
                        </li>
                      ) : null}
                      {todayEntries.length > 0 && buckets.tasks.length > 0 ? (
                        <li className="list-none px-0.5 py-2">
                          <h3 className="text-[11px] font-semibold uppercase leading-4 tracking-[0.04em] text-muted-foreground">
                            Other tasks
                          </h3>
                        </li>
                      ) : null}
                      {buckets.tasks.map((task) => renderTask(task, undefined, undefined, 'tasks'))}
                    </SectionShell>

                    <Collapsible
                      open={stashedOpen}
                      onOpenChange={setStashedOpen}
                      className={`mt-3 ${HOME_WIDGET_CARD_CLASS}`}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className={`${HOME_WIDGET_HEADER_CLASS} w-full`}
                        >
                          {stashedOpen ? (
                            <PackageOpen className="size-4.5 shrink-0 text-slate-600 dark:text-text-tertiary" />
                          ) : (
                            <Package className="size-4.5 shrink-0 text-slate-600 dark:text-text-tertiary" />
                          )}
                          <span className="min-w-0 truncate font-heading text-sm font-semibold tracking-[-0.01em] text-foreground">
                            Stashed
                          </span>
                          <span className={HOME_WIDGET_COUNT_CLASS}>
                            {buckets.stashed.length}
                          </span>
                          <ChevronDown
                            className={`${HOME_WIDGET_CHEVRON_CLASS} ${stashedOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1.5">
                        {buckets.stashed.length > 0 ? (
                          <ul className="divide-y divide-border/65">
                            {buckets.stashed.map((task) => renderTask(task))}
                          </ul>
                        ) : (
                          <div className={HOME_WIDGET_EMPTY_CLASS}>
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
    <CommandDialog
      open={focusPickerOpen}
      onOpenChange={setFocusPickerOpen}
      title="Add a task to Focus"
      description="Choose an incomplete task to keep close on Home."
    >
      <CommandInput placeholder="Search tasks or plans…" autoFocus />
      <CommandList>
        <CommandEmpty>No matching tasks available to focus.</CommandEmpty>
        <CommandGroup heading="Tasks">
          {focusCandidates.map((task) => (
            <CommandItem
              key={task.id}
              value={`${task.title} ${task.list?.title ?? 'Unsorted'}`}
              onSelect={() => {
                void handleFocus(task.id, true)
                setFocusPickerOpen(false)
              }}
            >
              <div className="min-w-0">
                <p className="truncate">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.list?.title ?? 'Unsorted'}{task.due_date ? ` · Due ${task.due_date}` : ''}
                </p>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">Add to Focus</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
    </>
  )
}
