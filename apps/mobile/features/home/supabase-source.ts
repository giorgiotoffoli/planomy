import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgendaBlock,
  CalendarEventWithList,
  Category,
  EventOccurrenceException,
  List,
  RecurrenceRule,
  TaskOccurrence,
  TaskOccurrenceOverride,
  TaskWithList,
} from '@planomy/types'
import type { Database, Json, Tables } from '@planomy/lib/supabase/database-types'
import type { WrappedMasterKeyPayload } from '@planomy/lib/crypto/e2ee'
import {
  defaultHomeSourcePreferences,
  normalizeHomeSourcePreferences,
} from '@planomy/lib/home'
import { expandCalendarEvents } from '@planomy/lib/events'
import {
  nextOccurrenceDate,
  normalizeRecurrenceRule,
  occurrenceDateForCompletion,
  recurringSessionTimes,
} from '@planomy/lib/recurrence'
import { addCalendarDays } from '@planomy/lib/today'
import { isListColor } from '@planomy/lib/list-colors'
import type { HomeCommand, HomeDataSource, HomeSnapshot, TaskDraft } from './model'
import { validateDraft } from './model'
import { nativeE2EE } from '@/lib/vault/native-crypto'

type NativeClient = SupabaseClient<Database>
type TaskRow = Tables<'tasks'>
type ListRow = Tables<'lists'>
type CategoryRow = Tables<'categories'>
type OccurrenceRow = Tables<'task_occurrences'>
type BlockRow = Tables<'task_time_blocks'>
type EventRow = Tables<'events'>
type ExceptionRow = Tables<'event_occurrence_exceptions'>

const CALENDAR_RANGE_DAYS = 31
const OCCURRENCE_LOOKBACK_DAYS = 30

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function requiredText(value: string | null, field: string) {
  if (value === null) throw new Error(`Encrypted ${field} is missing.`)
  return value
}

function safeListColor(value: string | null): List['color'] {
  if (!value || !isListColor(value)) throw new Error('A list has an unsupported color.')
  return value
}

function categoryColor(value: string | null): Category['color'] {
  return value && isListColor(value) ? value : null
}

function mappedRecurrence(value: Json | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? normalizeRecurrenceRule(value as unknown as RecurrenceRule)
    : null
}

async function decryptNullable(value: string | null | undefined, key: Uint8Array) {
  return value ? nativeE2EE.decryptString(value, key) : value ?? ''
}

async function mapLists(rows: ListRow[], masterKey: Uint8Array) {
  return Promise.all(rows.map(async (row): Promise<List> => {
    if (row.default_view !== 'list' && row.default_view !== 'board') {
      throw new Error('A list has an unsupported default view.')
    }
    return {
      id: row.id,
      user_id: row.user_id ?? '',
      title: await nativeE2EE.decryptString(requiredText(row.title, 'list title'), masterKey),
      emoji: await decryptNullable(row.emoji, masterKey) || null,
      color: safeListColor(row.color),
      default_view: row.default_view,
    }
  }))
}

async function mapCategories(rows: CategoryRow[], masterKey: Uint8Array) {
  return Promise.all(rows.map(async (row): Promise<Category> => ({
    id: row.id,
    list_id: row.list_id,
    title: await nativeE2EE.decryptString(requiredText(row.title, 'category title'), masterKey),
    position: row.position,
    color: categoryColor(row.color),
    created_at: row.created_at,
  })))
}

function mapTaskRows(
  rows: TaskRow[],
  lists: Map<string, List>,
  categories: Map<string, Category>,
  decrypted: { title: string; notes: string }[],
): TaskWithList[] {
  return rows.map((row, index) => {
    if (!row.user_id || row.title === null) throw new Error('A task is missing required data.')
    const recurrence = mappedRecurrence(row.recurrence_rule)
    return {
      user_id: row.user_id,
      id: row.id,
      title: decrypted[index].title,
      notes: decrypted[index].notes,
      completed: row.completed,
      focused: row.focused,
      stashed: row.stashed,
      position: row.position,
      created_at: row.created_at,
      list_id: row.list_id,
      list: row.list_id ? listSummary(lists.get(row.list_id)) : null,
      category_id: row.category_id,
      category: row.category_id ? categorySummary(categories.get(row.category_id)) : null,
      due_date: row.due_date,
      due_time: row.due_time,
      recurrence_rule: recurrence,
    }
  })
}

function listSummary(list: List | undefined): TaskWithList['list'] {
  if (!list) return null
  return {
    id: list.id,
    title: list.title,
    emoji: list.emoji,
    color: list.color,
    default_view: list.default_view,
  }
}

function categorySummary(category: Category | undefined): NonNullable<TaskWithList['category']> | null {
  if (!category) return null
  return { id: category.id, list_id: category.list_id, color: category.color ?? null }
}

async function mapTasks(
  rows: TaskRow[],
  lists: Map<string, List>,
  categories: Map<string, Category>,
  masterKey: Uint8Array,
) {
  const decrypted = await Promise.all(rows.map(async (row) => ({
    title: await nativeE2EE.decryptString(requiredText(row.title, 'task title'), masterKey),
    notes: await decryptNullable(row.notes, masterKey),
  })))
  return mapTaskRows(rows, lists, categories, decrypted)
}

async function mapEvents(
  rows: EventRow[],
  lists: Map<string, List>,
  categories: Map<string, Category>,
  masterKey: Uint8Array,
) {
  return Promise.all(rows.map(async (row): Promise<CalendarEventWithList> => ({
    ...row,
    title: await nativeE2EE.decryptString(row.title, masterKey),
    description: await decryptNullable(row.description, masterKey) || null,
    location: await decryptNullable(row.location, masterKey) || null,
    recurrence_rule: mappedRecurrence(row.recurrence_rule),
    list: row.list_id ? listSummary(lists.get(row.list_id)) : null,
    category: row.category_id ? categorySummary(categories.get(row.category_id)) : null,
    color: categoryColor(row.color),
  })))
}

async function mapExceptions(
  rows: ExceptionRow[],
  categories: Map<string, Category>,
  masterKey: Uint8Array,
) {
  return Promise.all(rows.map(async (row): Promise<EventOccurrenceException> => ({
    ...row,
    title: row.title ? await nativeE2EE.decryptString(row.title, masterKey) : null,
    description: await decryptNullable(row.description, masterKey) || null,
    location: await decryptNullable(row.location, masterKey) || null,
    category: row.category_id ? categorySummary(categories.get(row.category_id)) : null,
    color: categoryColor(row.color),
  })))
}

async function decryptOccurrence(row: OccurrenceRow, masterKey: Uint8Array): Promise<TaskOccurrence> {
  const value = row.override_data
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...row, override_data: null }
  const override = value as unknown as TaskOccurrenceOverride
  return {
    ...row,
    override_data: {
      ...override,
      ...(override.title !== undefined ? { title: await nativeE2EE.decryptString(override.title, masterKey) } : {}),
      ...(override.notes !== undefined ? { notes: await nativeE2EE.decryptString(override.notes, masterKey) } : {}),
    },
  }
}

function utcBoundary(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString()
}

function calendarRange(day: string) {
  const startsOn = addCalendarDays(day, -1)
  const endsOn = addCalendarDays(day, CALENDAR_RANGE_DAYS)
  return {
    startsOn,
    endsOn,
    startsAt: utcBoundary(startsOn),
    endsAt: utcBoundary(addCalendarDays(endsOn, 1)),
  }
}

async function fetchKeychain(client: NativeClient, userId: string): Promise<WrappedMasterKeyPayload> {
  const { data, error } = await client
    .from('user_keychain')
    .select('wrapped_master_key, wrapping_key_salt, wrapping_key_iv, kdf, kdf_iterations, wrapping_algorithm, version')
    .eq('user_id', userId)
    .maybeSingle()
  fail(error)
  if (!data) throw new Error('No vault key was found for this account. Finish vault setup on Planomy web first.')
  return {
    wrappedMasterKey: data.wrapped_master_key,
    wrappingKeySalt: data.wrapping_key_salt,
    wrappingKeyIv: data.wrapping_key_iv,
    kdf: data.kdf as WrappedMasterKeyPayload['kdf'],
    kdfIterations: data.kdf_iterations,
    wrappingAlgorithm: data.wrapping_algorithm as WrappedMasterKeyPayload['wrappingAlgorithm'],
    version: data.version as WrappedMasterKeyPayload['version'],
  }
}

export async function unlockNativeVault(client: NativeClient, userId: string, password: string) {
  const payload = await fetchKeychain(client, userId)
  return nativeE2EE.unwrapMasterKey(password, payload)
}

export function createSupabaseHomeSource(
  client: NativeClient,
  userId: string,
  masterKey: Uint8Array,
): HomeDataSource {
  let disposed = false
  let currentDay = new Date().toISOString().slice(0, 10)

  function assertActive() {
    if (disposed) throw new Error('Your vault is locked. Unlock it to continue.')
  }

  async function read(day: string): Promise<HomeSnapshot> {
    assertActive()
    currentDay = day
    const range = calendarRange(day)
    const occurrenceStart = addCalendarDays(day, -OCCURRENCE_LOOKBACK_DAYS)
    const [tasksResult, listsResult, preferencesResult, eventsResult] = await Promise.all([
      client.from('tasks').select('*').eq('user_id', userId).order('position', { ascending: true }).order('created_at', { ascending: false }),
      client.from('lists').select('*').eq('user_id', userId).order('title', { ascending: true }),
      client.from('user_preferences').select('excluded_home_list_ids, excluded_home_category_ids, included_home_category_ids, show_unsorted_on_home').eq('user_id', userId).maybeSingle(),
      client.from('events').select('*').eq('user_id', userId),
    ])
    fail(tasksResult.error)
    fail(listsResult.error)
    fail(preferencesResult.error)
    fail(eventsResult.error)

    const listRows = listsResult.data as ListRow[]
    const eventRows = eventsResult.data as EventRow[]
    const listIds = listRows.map((list) => list.id)
    const recurringEventIds = eventRows.filter((event) => event.recurrence_rule).map((event) => event.id)
    const [categoryResult, occurrenceResult, blockResult, exceptionResult] = await Promise.all([
      listIds.length
        ? client.from('categories').select('*').in('list_id', listIds).order('position', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      client.from('task_occurrences').select('*').eq('user_id', userId).gte('occurrence_date', occurrenceStart).lt('occurrence_date', range.endsOn).order('occurrence_date', { ascending: true }),
      client.from('task_time_blocks').select('*').eq('user_id', userId).gte('starts_at', range.startsAt).lt('starts_at', range.endsAt).order('starts_at', { ascending: true }),
      recurringEventIds.length
        ? client.from('event_occurrence_exceptions').select('*').eq('user_id', userId).in('event_id', recurringEventIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    fail(categoryResult.error)
    fail(occurrenceResult.error)
    fail(blockResult.error)
    fail(exceptionResult.error)

    const listData = await mapLists(listRows, masterKey)
    const lists = new Map(listData.map((item) => [item.id, item]))
    const categoryRows = categoryResult.data as CategoryRow[]
    const categoryData = await mapCategories(categoryRows, masterKey)
    const categories = new Map(categoryData.map((item) => [item.id, item]))
    const tasks = await mapTasks(tasksResult.data as TaskRow[], lists, categories, masterKey)
    const events = await mapEvents(eventRows, lists, categories, masterKey)
    const exceptions = await mapExceptions(exceptionResult.data as ExceptionRow[], categories, masterKey)
    const occurrences = await Promise.all((occurrenceResult.data as OccurrenceRow[]).map((row) => decryptOccurrence(row, masterKey)))
    const taskById = new Map(tasks.map((task) => [task.id, task]))
    const occurrenceById = new Map(occurrences.map((occurrence) => [occurrence.id, occurrence]))
    const scheduledBlocks: AgendaBlock[] = (blockResult.data as BlockRow[]).flatMap((row) => {
      const task = taskById.get(row.task_id)
      if (!task) return []
      const occurrence = row.occurrence_id ? occurrenceById.get(row.occurrence_id) ?? null : null
      const override = occurrence?.override_data
      const effectiveTask = occurrence && override
        ? {
            ...task,
            title: override.title ?? task.title,
            notes: override.notes ?? task.notes,
            list_id: override.listId ?? task.list_id,
            category_id: override.categoryId ?? task.category_id,
            due_date: override.dueDate ?? task.due_date,
            due_time: override.dueTime ?? task.due_time,
            completed: occurrence.completed,
          }
        : occurrence ? { ...task, completed: occurrence.completed } : task
      return [{
        ...row,
        status: row.status === 'skipped' || occurrence?.skipped ? 'skipped' as const : 'scheduled' as const,
        task: effectiveTask,
        occurrence,
      }]
    })

    const expandedEvents = expandCalendarEvents(events, exceptions, range)
    const homePreferences = normalizeHomeSourcePreferences(
      preferencesResult.data,
      listData.map((list) => list.id),
      categoryData.map((category) => category.id),
      categoryData,
    )
    return {
      tasks,
      lists: listData,
      categories: categoryData,
      currentOccurrences: occurrences.filter((occurrence) => occurrence.occurrence_date === day),
      occurrences,
      scheduledBlocks,
      upcomingEvents: expandedEvents,
      preferences: homePreferences ?? defaultHomeSourcePreferences(),
    }
  }

  async function validateOrganization(listId: string | null, categoryId: string | null) {
    if (listId) {
      const { data, error } = await client.from('lists').select('id').eq('id', listId).eq('user_id', userId).maybeSingle()
      fail(error)
      if (!data) throw new Error('This list is no longer available.')
    }
    if (!categoryId) return
    if (!listId) throw new Error('Categories belong to a list.')
    const { data, error } = await client.from('categories').select('id').eq('id', categoryId).eq('list_id', listId).maybeSingle()
    fail(error)
    if (!data) throw new Error('This category does not belong to the selected list.')
  }

  async function saveTask(command: Extract<HomeCommand, { type: 'save' }>, data: HomeSnapshot) {
    const draft = command.draft
    validateDraft(draft, data)
    await validateOrganization(draft.listId, draft.categoryId)
    const title = await nativeE2EE.encryptString(draft.title.trim(), masterKey)
    const notes = await nativeE2EE.encryptString(draft.notes, masterKey)
    const fields = {
      title,
      notes,
      list_id: draft.listId,
      category_id: draft.categoryId,
      due_date: draft.dueDate || null,
      due_time: draft.dueDate ? draft.dueTime : null,
    }

    if (command.creating) {
      const { error } = await client.from('tasks').insert({
        user_id: userId,
        ...fields,
        focused: false,
        stashed: false,
        recurrence_rule: null,
      })
      fail(error)
      return
    }

    const { data: saved, error } = await client.from('tasks')
      .update(fields)
      .eq('id', command.id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    fail(error)
    if (!saved) throw new Error('This task is no longer available.')
  }

  async function completeTask(command: Extract<HomeCommand, { type: 'complete' }>) {
    const { data, error } = await client.from('tasks').select('recurrence_rule').eq('id', command.id).eq('user_id', userId).maybeSingle()
    fail(error)
    if (!data) throw new Error('This task is no longer available.')
    const rule = mappedRecurrence(data.recurrence_rule)
    if (rule && command.completed) {
      const { data: existingOccurrences, error: occurrencesError } = await client.from('task_occurrences')
        .select('id, occurrence_date, completed, skipped')
        .eq('task_id', command.id)
        .eq('user_id', userId)
        .order('occurrence_date', { ascending: true })
      fail(occurrencesError)
      const occurrenceDate = occurrenceDateForCompletion(rule, command.day, existingOccurrences ?? [])

      let nextOccurrenceDateValue: string | null = null
      if (occurrenceDate) {
        const { data: completedOccurrence, error: saveOccurrenceError } = await client.from('task_occurrences')
          .upsert({
            user_id: userId,
            task_id: command.id,
            occurrence_date: occurrenceDate,
            completed: true,
            skipped: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'task_id,occurrence_date' })
          .select('id')
          .single()
        fail(saveOccurrenceError)
        const nextDate = nextOccurrenceDate(rule, occurrenceDate)
        if (nextDate) {
          const { error: createNextError } = await client.from('task_occurrences').upsert(
            { user_id: userId, task_id: command.id, occurrence_date: nextDate },
            { onConflict: 'task_id,occurrence_date', ignoreDuplicates: true },
          )
          fail(createNextError)
          const { data: nextOccurrence, error: nextReadError } = await client.from('task_occurrences')
            .select('*')
            .eq('user_id', userId)
            .eq('task_id', command.id)
            .eq('occurrence_date', nextDate)
            .single()
          fail(nextReadError)
          if (!nextOccurrence) throw new Error('The next recurring occurrence could not be loaded.')
          if (!nextOccurrence.cancelled) {
            const sessions = recurringSessionTimes(rule, nextDate).map((session) => ({
              user_id: userId,
              task_id: command.id,
              occurrence_id: nextOccurrence.id,
              session_index: session.sessionIndex,
              is_override: false,
              starts_at: session.startsAt,
              ends_at: session.endsAt,
              status: 'scheduled' as const,
            }))
            if (sessions.length) {
              const { error: sessionError } = await client.from('task_time_blocks').upsert(sessions, {
                onConflict: 'occurrence_id,session_index',
                ignoreDuplicates: true,
              })
              fail(sessionError)
            }
          }
          nextOccurrenceDateValue = nextOccurrence.occurrence_date
        }
        void completedOccurrence
      }

      const taskCompleted = !nextOccurrenceDateValue
      const { error: taskError } = await client.from('tasks')
        .update({ completed: taskCompleted, ...(taskCompleted ? { focused: false } : {}) })
        .eq('id', command.id)
        .eq('user_id', userId)
      fail(taskError)
      return
    }
    const { error: updateError } = await client.from('tasks')
      .update({ completed: command.completed, ...(command.completed ? { focused: false } : {}) })
      .eq('id', command.id)
      .eq('user_id', userId)
    fail(updateError)
  }

  return {
    mode: 'vault' as const,
    read,
    async execute(command: HomeCommand) {
      assertActive()
      if (command.type === 'save') {
        const data = await read(currentDay)
        await saveTask(command, data)
      } else if (command.type === 'delete') {
        const { data, error } = await client.from('tasks').delete().eq('id', command.id).eq('user_id', userId).select('id').maybeSingle()
        fail(error)
        if (!data) throw new Error('This task is no longer available.')
      } else if (command.type === 'complete') {
        await completeTask(command)
      } else if (command.type === 'focus') {
        const { error } = await client.rpc('set_task_focus', { p_task_id: command.id, p_focused: command.focused })
        fail(error)
      } else if (command.type === 'stash') {
        const { error } = await client.from('tasks').update({ stashed: command.stashed, ...(command.stashed ? { focused: false } : {}) }).eq('id', command.id).eq('user_id', userId)
        fail(error)
      } else if (command.type === 'source') {
        const { error } = command.source.type === 'unsorted'
          ? await client.rpc('set_home_unsorted_visibility', { p_show_unsorted: command.visible })
          : await client.rpc('set_home_list_visibility', { p_list_id: command.source.listId, p_visible: command.visible, p_clear_category_overrides: true })
        fail(error)
      } else if (command.type === 'category') {
        const { error } = await client.rpc('set_home_category_visibility', { p_category_id: command.id, p_visible: command.visible })
        fail(error)
      } else {
        const { error } = await client.rpc('show_all_home_sources', {})
        fail(error)
      }
      return read(command.type === 'complete' ? command.day : currentDay)
    },
    dispose() {
      if (disposed) return
      disposed = true
      nativeE2EE.disposeMasterKey(masterKey)
    },
  }
}

export async function readNativeKeychain(client: NativeClient, userId: string) {
  return fetchKeychain(client, userId)
}

export function isValidTaskDraft(draft: TaskDraft, data: HomeSnapshot) {
  validateDraft(draft, data)
}
