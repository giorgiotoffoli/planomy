import type {
  CalendarEventWithList,
  Category,
  AgendaBlock,
  List,
  TaskOccurrence,
  TaskWithList,
} from '@planomy/types'
import {
  defaultHomeSourcePreferences,
  MAX_FOCUS_TASKS,
  setHomeCategoryEnabled,
  setHomeSourceEnabled,
  type HomeSource,
  type HomeSourcePreferences,
} from '../../../../src/lib/home.ts'
import { addCalendarDays, isDateKey } from '../../../../src/lib/today.ts'
import { nextOccurrenceDate } from '../../../../src/lib/recurrence.ts'

/** Decrypted, session-only view. A vault adapter owns authentication, encryption and persistence. */
export type HomeSnapshot = {
  tasks: TaskWithList[]
  lists: List[]
  categories: Category[]
  currentOccurrences: TaskOccurrence[]
  /** Materialized recurrence state in the visible calendar horizon. */
  occurrences: TaskOccurrence[]
  /** Persisted calendar sessions; due dates remain a separate task field. */
  scheduledBlocks: AgendaBlock[]
  upcomingEvents: CalendarEventWithList[]
  preferences: HomeSourcePreferences
}
export type TaskDraft = {
  title: string
  notes: string
  listId: string | null
  categoryId: string | null
  dueDate: string | null
  dueTime: string | null
}
export type HomeCommand =
  | { type: 'complete'; id: string; completed: boolean; day: string }
  | { type: 'focus'; id: string; focused: boolean }
  | { type: 'stash'; id: string; stashed: boolean }
  | { type: 'save'; id: string; draft: TaskDraft; creating: boolean }
  | { type: 'delete'; id: string }
  | { type: 'source'; source: HomeSource; visible: boolean }
  | { type: 'category'; id: string; visible: boolean }
  | { type: 'showAll' }
export type HomeSourcePreferenceCommand = Extract<
  HomeCommand,
  { type: 'source' | 'category' | 'showAll' }
>

/** Implement only after native session storage and the E2EE protocol have been reviewed.
 * Read/execute must return the authoritative snapshot, including materialized occurrences
 * and expanded event exceptions. Never persist this decrypted snapshot to disk.
 * On vault lock/sign-out, the owner must unmount HomeProvider to discard all decrypted state.
 */
export interface HomeDataSource {
  mode: 'vault' | 'preview'
  read(day: string): Promise<HomeSnapshot>
  execute(command: HomeCommand): Promise<HomeSnapshot>
  /** Persist a source choice without reloading the full Home snapshot. */
  persistSourcePreference(command: HomeSourcePreferenceCommand): Promise<void>
  dispose(): void
}

export function uncategorizedListIds(data: HomeSnapshot) {
  return new Set(
    [...data.tasks, ...data.upcomingEvents]
      .filter((item) => item.list_id && !item.category_id)
      .map((item) => item.list_id!),
  )
}

export function validateDraft(draft: TaskDraft, data: HomeSnapshot) {
  if (!draft.title.trim()) throw new Error('Give your task a title.')
  if (draft.dueDate && !isDateKey(draft.dueDate))
    throw new Error('Choose a valid due date.')
  if (
    draft.dueDate &&
    draft.dueTime &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.dueTime)
  )
    throw new Error('Choose a valid due time.')
  if (draft.listId && !data.lists.some((list) => list.id === draft.listId))
    throw new Error('This list is no longer available.')
  if (
    draft.categoryId &&
    !data.categories.some(
      (category) =>
        category.id === draft.categoryId && category.list_id === draft.listId,
    )
  )
    throw new Error('Choose a category from this list.')
}

/** Optimistic UI only. Live recurrence writes always belong to the authoritative adapter. */
export function projectHomeCommand(
  data: HomeSnapshot,
  command: HomeCommand,
): HomeSnapshot {
  if (command.type === 'showAll')
    return { ...data, preferences: defaultHomeSourcePreferences() }
  if (command.type === 'source')
    return {
      ...data,
      preferences: setHomeSourceEnabled(
        data.preferences,
        command.source,
        command.visible,
        data.categories,
      ),
    }
  if (command.type === 'category') {
    const category = data.categories.find((item) => item.id === command.id)
    return {
      ...data,
      preferences: setHomeCategoryEnabled(
        data.preferences,
        command.id,
        command.visible,
        data.categories,
        Boolean(category && uncategorizedListIds(data).has(category.list_id)),
      ),
    }
  }
  if (command.type === 'save') {
    validateDraft(command.draft, data)
    const { draft } = command
    const existing = data.tasks.find((task) => task.id === command.id)
    if (!command.creating && !existing)
      throw new Error('This task is no longer available.')
    const list = data.lists.find((list) => list.id === draft.listId) ?? null
    const category =
      data.categories.find((item) => item.id === draft.categoryId) ?? null
    const task: TaskWithList = {
      user_id: existing?.user_id ?? 'preview',
      id: command.id,
      completed: false,
      focused: false,
      stashed: false,
      position: data.tasks.length,
      ...existing,
      title: draft.title.trim(),
      notes: draft.notes,
      list_id: draft.listId,
      category_id: draft.categoryId,
      list,
      category: category
        ? { ...category, color: category.color ?? null }
        : null,
      due_date: draft.dueDate,
      due_time: draft.dueDate ? draft.dueTime : null,
    }
    return {
      ...data,
      tasks: command.creating
        ? [...data.tasks, task]
        : data.tasks.map((item) => (item.id === task.id ? task : item)),
    }
  }
  if (command.type === 'delete')
    return {
      ...data,
      tasks: data.tasks.filter((item) => item.id !== command.id),
      currentOccurrences: data.currentOccurrences.filter((item) => item.task_id !== command.id),
      occurrences: data.occurrences.filter((item) => item.task_id !== command.id),
      scheduledBlocks: data.scheduledBlocks.filter((item) => item.task_id !== command.id),
    }
  const task = data.tasks.find((task) => task.id === command.id)
  if (!task) throw new Error('This task is no longer available.')
  if (command.type === 'focus' && command.focused) {
    if (task.stashed || task.completed)
      throw new Error('Unstash this task before adding it to Focus.')
    if (
      !task.focused &&
      data.tasks.filter(
        (item) => item.focused && !item.stashed && !item.completed,
      ).length >= MAX_FOCUS_TASKS
    )
      throw new Error('You can focus up to three tasks. Remove one first.')
  }
  let occurrences = data.currentOccurrences
  let patch: Partial<TaskWithList>
  if (command.type === 'complete') {
    if (task.recurrence_rule && !task.completed) {
      // Preview only completes today's materialized occurrence; it cannot fabricate future sessions.
      const current = occurrences.find(
        (item) =>
          item.task_id === task.id &&
          item.occurrence_date === command.day &&
          !item.skipped &&
          !item.cancelled,
      )
      if (!current)
        throw new Error(
          'Open this recurring task on its scheduled day to complete it.',
        )
      occurrences = occurrences.map((item) =>
        item.id === current.id
          ? { ...item, completed: command.completed }
          : item,
      )
      const endsSeries =
        command.completed &&
        !nextOccurrenceDate(task.recurrence_rule, command.day)
      patch = {
        completed: endsSeries,
        ...(endsSeries ? { focused: false } : {}),
      }
    } else
      patch = {
        completed: command.completed,
        ...(command.completed ? { focused: false } : {}),
      }
  } else if (command.type === 'focus') patch = { focused: command.focused }
  else
    patch = {
      stashed: command.stashed,
      ...(command.stashed ? { focused: false } : {}),
    }
  return {
    ...data,
    currentOccurrences: occurrences,
    tasks: data.tasks.map((item) =>
      item.id === task.id ? { ...item, ...patch } : item,
    ),
  }
}

/** Explicit development fixture. No network, credentials, encryption keys or persistence. */
export function previewSnapshot(day: string): HomeSnapshot {
  const lists: List[] = [
    {
      id: 'personal',
      user_id: 'preview',
      title: 'Personal',
      emoji: '🌱',
      color: 'green',
      default_view: 'list',
    },
    {
      id: 'work',
      user_id: 'preview',
      title: 'Work',
      emoji: '💼',
      color: 'blue',
      default_view: 'list',
    },
  ]
  const categories: Category[] = [
    { id: 'ideas', list_id: 'work', title: 'Ideas', position: 0 },
    { id: 'projects', list_id: 'work', title: 'Projects', position: 1 },
  ]
  const task = (
    id: string,
    title: string,
    extra: Partial<TaskWithList> = {},
  ): TaskWithList => ({
    user_id: 'preview',
    id,
    title,
    completed: false,
    focused: false,
    stashed: false,
    due_date: null,
    due_time: null,
    list_id: null,
    category_id: null,
    list: null,
    position: 0,
    notes: '',
    ...extra,
  })
  return {
    lists,
    categories,
    preferences: defaultHomeSourcePreferences(),
    tasks: [
      task('focus-1', 'Make room for a little deep work', {
        focused: true,
        list_id: 'work',
        list: lists[1],
        category_id: 'projects',
      }),
      task('focus-2', 'Take a walk without your phone', {
        focused: true,
        list_id: 'personal',
        list: lists[0],
        position: 1,
      }),
      task('overdue', 'Send the project outline', {
        due_date: addCalendarDays(day, -1),
        list_id: 'work',
        list: lists[1],
        category_id: 'projects',
        position: 2,
      }),
      task('today', 'Pick up a few groceries', {
        due_date: day,
        list_id: 'personal',
        list: lists[0],
        position: 3,
      }),
      task('week', 'Plan something to look forward to', {
        due_date: addCalendarDays(day, 2),
        position: 4,
      }),
      task('idea', 'Write down that idea', {
        list_id: 'work',
        list: lists[1],
        category_id: 'ideas',
        notes: 'A little space to think.',
        position: 5,
      }),
      task('unsorted', 'Find a new book to get lost in', { position: 6 }),
      task('stashed', 'Reorganize the bookshelf', {
        stashed: true,
        list_id: 'personal',
        list: lists[0],
        position: 7,
      }),
      task('repeat', 'Read for ten minutes', {
        recurrence_rule: { frequency: 'daily', startDate: day },
        position: 8,
      }),
    ],
    currentOccurrences: [
      {
        id: 'repeat-today',
        user_id: 'preview',
        task_id: 'repeat',
        occurrence_date: day,
        completed: false,
        skipped: false,
        cancelled: false,
      },
    ],
    occurrences: [
      {
        id: 'repeat-today',
        user_id: 'preview',
        task_id: 'repeat',
        occurrence_date: day,
        completed: false,
        skipped: false,
        cancelled: false,
      },
    ],
    scheduledBlocks: [],
    upcomingEvents: [
      {
        id: 'event',
        user_id: 'preview',
        title: 'A slower afternoon',
        list_id: 'personal',
        list: lists[0],
        all_day: true,
        starts_on: addCalendarDays(day, 1),
        ends_on: addCalendarDays(day, 2),
        starts_at: null,
        ends_at: null,
        time_zone: 'America/Chicago',
        recurrence_rule: null,
        description: 'Make a little room for yourself.',
        location: null,
        show_in_upcoming: true,
        created_at: '',
        updated_at: '',
      },
    ],
  }
}
export function createPreviewSource(day: string): HomeDataSource {
  let data = previewSnapshot(day)
  return {
    mode: 'preview',
    async read() {
      return data
    },
    async execute(command) {
      data = projectHomeCommand(data, command)
      return data
    },
    async persistSourcePreference(command) {
      data = projectHomeCommand(data, command)
    },
    dispose() {
      data = {
        tasks: [],
        lists: [],
        categories: [],
        currentOccurrences: [],
        occurrences: [],
        scheduledBlocks: [],
        upcomingEvents: [],
        preferences: defaultHomeSourcePreferences(),
      }
    },
  }
}
