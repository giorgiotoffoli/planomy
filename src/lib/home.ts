import { format } from 'date-fns'
import type { Category, List, TaskWithList } from '@/types'
import {
  addCalendarDays,
  calendarDaysBetween,
  localDateKey,
} from './today.ts'

export const MAX_FOCUS_TASKS = 3
export const DUE_SOON_DAYS = 7

export type HomeSource =
  | { type: 'unsorted' }
  | { type: 'list'; listId: string }

export type HomeSourcePreferences = {
  excludedHomeListIds: string[]
  excludedHomeCategoryIds: string[]
  includedHomeCategoryIds: string[]
  showUnsortedOnHome: boolean
}

export type HomeListState = 'enabled' | 'disabled' | 'partial'

export function defaultHomeSourcePreferences(): HomeSourcePreferences {
  return {
    excludedHomeListIds: [],
    excludedHomeCategoryIds: [],
    includedHomeCategoryIds: [],
    showUnsortedOnHome: true,
  }
}

export function normalizeHomeSourcePreferences(
  value:
    | {
      excluded_home_list_ids?: string[] | null
      excluded_home_category_ids?: string[] | null
      included_home_category_ids?: string[] | null
      show_unsorted_on_home?: boolean | null
    }
    | null
    | undefined,
  listIds?: readonly string[],
  categoryIds?: readonly string[],
  categories?: readonly Pick<Category, 'id' | 'list_id'>[],
): HomeSourcePreferences {
  const availableListIds = listIds ? new Set(listIds) : null
  const availableCategoryIds = categoryIds ? new Set(categoryIds) : null
  const excludedHomeListIds = Array.from(
    new Set(value?.excluded_home_list_ids ?? []),
  ).filter((listId) => availableListIds?.has(listId) ?? true)
  const excludedHomeCategoryIds = Array.from(
    new Set(value?.excluded_home_category_ids ?? []),
  ).filter((categoryId) => availableCategoryIds?.has(categoryId) ?? true)
  const hasStoredIncludedCategories =
    value?.included_home_category_ids != null
  const storedIncludedHomeCategoryIds = Array.from(
    new Set(value?.included_home_category_ids ?? []),
  ).filter((categoryId) => availableCategoryIds?.has(categoryId) ?? true)
  const includedHomeCategoryIds = hasStoredIncludedCategories
    ? storedIncludedHomeCategoryIds
    : categories
        ?.filter(
          (category) =>
            !excludedHomeListIds.includes(category.list_id) &&
            !excludedHomeCategoryIds.includes(category.id),
        )
        .map((category) => category.id) ?? []

  return {
    excludedHomeListIds,
    excludedHomeCategoryIds,
    includedHomeCategoryIds,
    showUnsortedOnHome: value?.show_unsorted_on_home ?? true,
  }
}

export function isHomeSourceEnabled(
  source: HomeSource,
  preferences: HomeSourcePreferences,
) {
  if (source.type === 'unsorted') return preferences.showUnsortedOnHome
  return !preferences.excludedHomeListIds.includes(source.listId)
}

export function getHomeListState(
  listId: string,
  categories: Pick<Category, 'id' | 'list_id'>[],
  preferences: HomeSourcePreferences,
  hasUncategorizedTasks = false,
): HomeListState {
  if (preferences.excludedHomeListIds.includes(listId)) return 'disabled'

  const listCategories = categories.filter(
    (category) => category.list_id === listId,
  )
  const enabledCount = getEnabledCategoryIds(
    listId, categories, preferences,
  ).length
  const totalCount = listCategories.length + (hasUncategorizedTasks ? 1 : 0)
  const enabledSourceCount = enabledCount + (hasUncategorizedTasks ? 1 : 0)

  if (totalCount === 0) return 'enabled'
  if (enabledSourceCount === 0) return 'disabled'
  return enabledSourceCount === totalCount ? 'enabled' : 'partial'
}

export function isHomeCategoryEnabled(
  category: Pick<Category, 'id' | 'list_id'>,
  categories: Pick<Category, 'id' | 'list_id'>[],
  preferences: HomeSourcePreferences,
) {
  return getEnabledCategoryIds(category.list_id, categories, preferences).includes(
    category.id,
  )
}

export function setHomeSourceEnabled(
  preferences: HomeSourcePreferences,
  source: HomeSource,
  enabled: boolean,
  categories: Pick<Category, 'id' | 'list_id'>[] = [],
): HomeSourcePreferences {
  if (source.type === 'unsorted') {
    return { ...preferences, showUnsortedOnHome: enabled }
  }

  return setHomeListEnabled(preferences, source.listId, enabled, categories)
}

export function setHomeListEnabled(
  preferences: HomeSourcePreferences,
  listId: string,
  enabled: boolean,
  categories: Pick<Category, 'id' | 'list_id'>[],
): HomeSourcePreferences {
  const excludedHomeListIds = enabled
    ? preferences.excludedHomeListIds.filter((id) => id !== listId)
    : preferences.excludedHomeListIds.includes(listId)
      ? preferences.excludedHomeListIds
      : [...preferences.excludedHomeListIds, listId]

  const categoryIds = new Set(categoryIdsForList(listId, categories))
  const excludedHomeCategoryIds = preferences.excludedHomeCategoryIds.filter(
    (categoryId) => !categoryIds.has(categoryId),
  )
  const includedHomeCategoryIds = preferences.includedHomeCategoryIds.filter(
    (categoryId) => !categoryIds.has(categoryId),
  )

  return {
    ...preferences,
    excludedHomeListIds,
    excludedHomeCategoryIds,
    includedHomeCategoryIds,
  }
}

export function setHomeCategoryEnabled(
  preferences: HomeSourcePreferences,
  categoryId: string,
  enabled: boolean,
  categories: Pick<Category, 'id' | 'list_id'>[],
  hasUncategorizedTasks = false,
): HomeSourcePreferences {
  const category = categories.find(({ id }) => id === categoryId)
  if (!category) return preferences

  const categoryIds = categoryIdsForList(category.list_id, categories)
  const categoryIdSet = new Set(categoryIds)
  const otherExcludedCategoryIds = preferences.excludedHomeCategoryIds.filter(
    (id) => !categoryIdSet.has(id),
  )
  const otherIncludedCategoryIds = preferences.includedHomeCategoryIds.filter(
    (id) => !categoryIdSet.has(id),
  )
  const parentState = getHomeListState(
    category.list_id,
    categories,
    preferences,
    hasUncategorizedTasks,
  )

  if (parentState === 'disabled') {
    if (!enabled) {
      return {
        ...preferences,
        excludedHomeCategoryIds: otherExcludedCategoryIds,
        includedHomeCategoryIds: otherIncludedCategoryIds,
      }
    }

    return {
      ...preferences,
      excludedHomeListIds: preferences.excludedHomeListIds.filter(
        (id) => id !== category.list_id,
      ),
      excludedHomeCategoryIds: [
        ...otherExcludedCategoryIds,
        ...categoryIds.filter((id) => id !== categoryId),
      ],
      includedHomeCategoryIds: [...otherIncludedCategoryIds, categoryId],
    }
  }

  const currentlyEnabledCategoryIds = getEnabledCategoryIds(
    category.list_id,
    categories,
    preferences,
  )
  const nextEnabledCategoryIds = enabled
    ? Array.from(new Set([...currentlyEnabledCategoryIds, categoryId]))
    : currentlyEnabledCategoryIds.filter((id) => id !== categoryId)

  if (nextEnabledCategoryIds.length === 0) {
    if (hasUncategorizedTasks) {
      return {
        ...preferences,
        excludedHomeListIds: preferences.excludedHomeListIds.filter(
          (id) => id !== category.list_id,
        ),
        excludedHomeCategoryIds: [
          ...otherExcludedCategoryIds,
          ...categoryIds,
        ],
        includedHomeCategoryIds: otherIncludedCategoryIds,
      }
    }

    return {
      ...preferences,
      excludedHomeListIds: preferences.excludedHomeListIds.includes(
        category.list_id,
      )
        ? preferences.excludedHomeListIds
        : [...preferences.excludedHomeListIds, category.list_id],
      excludedHomeCategoryIds: otherExcludedCategoryIds,
      includedHomeCategoryIds: otherIncludedCategoryIds,
    }
  }

  if (nextEnabledCategoryIds.length === categoryIds.length) {
    return {
      ...preferences,
      excludedHomeListIds: preferences.excludedHomeListIds.filter(
        (id) => id !== category.list_id,
      ),
      excludedHomeCategoryIds: otherExcludedCategoryIds,
      includedHomeCategoryIds: otherIncludedCategoryIds,
    }
  }

  const nextEnabledCategoryIdSet = new Set(nextEnabledCategoryIds)

  return {
    ...preferences,
    excludedHomeListIds: preferences.excludedHomeListIds.filter(
      (id) => id !== category.list_id,
    ),
    excludedHomeCategoryIds: [
      ...otherExcludedCategoryIds,
      ...categoryIds.filter((id) => !nextEnabledCategoryIdSet.has(id)),
    ],
    includedHomeCategoryIds: [
      ...otherIncludedCategoryIds,
      ...nextEnabledCategoryIds,
    ],
  }
}

export function getHomeSourceState(
  source: HomeSource,
  categories: Pick<Category, 'id' | 'list_id'>[],
  preferences: HomeSourcePreferences,
  hasUncategorizedTasks = false,
): HomeListState {
  if (source.type === 'unsorted') {
    return preferences.showUnsortedOnHome ? 'enabled' : 'disabled'
  }

  return getHomeListState(
    source.listId,
    categories,
    preferences,
    hasUncategorizedTasks,
  )
}

export function isTaskVisibleOnHome(
  task: Pick<TaskWithList, 'list_id' | 'category_id' | 'focused'>,
  preferences: HomeSourcePreferences,
  categories: Pick<Category, 'id' | 'list_id'>[] = [],
) {
  if (task.focused) return true

  if (task.list_id === null) return preferences.showUnsortedOnHome
  if (preferences.excludedHomeListIds.includes(task.list_id)) return false

  if (task.category_id == null) {
    return true
  }

  return isHomeCategoryEnabled(
    { id: task.category_id, list_id: task.list_id },
    categories,
    preferences,
  )
}

export function filterHomeTasks(
  tasks: TaskWithList[],
  preferences: HomeSourcePreferences,
  categories: Pick<Category, 'id' | 'list_id'>[] = [],
) {
  return tasks.filter((task) =>
    isTaskVisibleOnHome(task, preferences, categories),
  )
}

function categoryIdsForList(
  listId: string,
  categories: Pick<Category, 'id' | 'list_id'>[],
) {
  return categories
    .filter((category) => category.list_id === listId)
    .map((category) => category.id)
}

function getEnabledCategoryIds(
  listId: string,
  categories: Pick<Category, 'id' | 'list_id'>[],
  preferences: HomeSourcePreferences,
) {
  if (preferences.excludedHomeListIds.includes(listId)) return []

  const listCategoryIds = categoryIdsForList(listId, categories)
  if (listCategoryIds.length === 0) return []

  const includedCategoryIds = new Set(preferences.includedHomeCategoryIds)
  const excludedCategoryIds = new Set(preferences.excludedHomeCategoryIds)
  const hasExplicitSelection = listCategoryIds.some((id) =>
    includedCategoryIds.has(id),
  )

  if (hasExplicitSelection) {
    return listCategoryIds.filter((id) => includedCategoryIds.has(id))
  }

  if (listCategoryIds.some((id) => excludedCategoryIds.has(id))) {
    return listCategoryIds.filter((id) => !excludedCategoryIds.has(id))
  }

  return listCategoryIds
}

export function getHomeSources(lists: Pick<List, 'id'>[]): HomeSource[] {
  return [
    { type: 'unsorted' },
    ...lists.map((list) => ({ type: 'list' as const, listId: list.id })),
  ]
}

export type HomeBuckets = {
  focus: TaskWithList[]
  dueSoon: TaskWithList[]
  tasks: TaskWithList[]
  stashed: TaskWithList[]
}

export function isDueSoon(task: TaskWithList, day = localDateKey()) {
  if (!task.due_date) return false

  return task.due_date <= addCalendarDays(day, DUE_SOON_DAYS)
}

function stableTaskOrder(a: TaskWithList, b: TaskWithList) {
  const positionOrder = a.position - b.position
  if (positionOrder !== 0) return positionOrder

  const createdOrder = (a.created_at ?? '').localeCompare(b.created_at ?? '')
  if (createdOrder !== 0) return createdOrder

  return a.id.localeCompare(b.id)
}

function dueDateOrder(a: TaskWithList, b: TaskWithList) {
  const dateOrder = (a.due_date ?? '').localeCompare(b.due_date ?? '')
  if (dateOrder !== 0) return dateOrder

  const timeOrder = (a.due_time ?? '99:99:99').localeCompare(
    b.due_time ?? '99:99:99',
  )
  if (timeOrder !== 0) return timeOrder

  return stableTaskOrder(a, b)
}

export function getHomeBuckets(
  input: TaskWithList[],
  day = localDateKey(),
): HomeBuckets {
  const focus: TaskWithList[] = []
  const dueSoon: TaskWithList[] = []
  const tasks: TaskWithList[] = []
  const stashed: TaskWithList[] = []

  for (const task of input) {
    if (task.completed) continue

    if (task.stashed) {
      stashed.push(task)
    } else if (task.focused) {
      focus.push(task)
    } else if (isDueSoon(task, day)) {
      dueSoon.push(task)
    } else {
      tasks.push(task)
    }
  }

  focus.sort(stableTaskOrder)
  dueSoon.sort(dueDateOrder)
  tasks.sort(stableTaskOrder)
  stashed.sort(stableTaskOrder)

  return { focus, dueSoon, tasks, stashed }
}

export function getDeadlineLabel(
  dueDate: string | null,
  day = localDateKey(),
) {
  if (!dueDate) return null

  const difference = calendarDaysBetween(day, dueDate)

  if (difference < 0) {
    const overdueDays = Math.abs(difference)
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
  }

  if (difference === 0) return 'Today'
  if (difference === 1) return 'Tomorrow'

  return format(new Date(`${dueDate}T12:00:00`), 'EEEE')
}

export function getDueTimeLabel(dueTime: string | null) {
  if (!dueTime) return null

  const [hours, minutes] = dueTime.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}
