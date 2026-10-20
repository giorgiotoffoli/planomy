'use client'

import { CalendarEventWithList, Category, List, TaskWithList } from '@/types'
import type { ListColor } from '@/lib/list-colors'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import TaskList from '../lists/task-list'
import TaskBoard from '../boards/task-board'
import {
  TASK_ORGANIZATION_CHANGED,
  TASKS_CHANGED,
  deleteTask,
  notifyTasksChanged,
  renameTask,
  reorderTasks,
  updateTaskDueDate,
  updateTaskNotes,
  changeTaskCategory,
  notifyTaskOrganizationChanged,
  taskVisualMutationFromEvent,
  taskOrganizationChangeFromEvent,
} from '../tasks/mutations'
import { updateTaskCompleted as updateTaskCompletedAction } from '../tasks/actions'
import { getTasks } from '../tasks/queries'
import { getListEvents, getListTasks } from '../lists/queries'
import { Skeleton } from '../ui/skeleton'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import CollapsiblePageHeader from './header/collapsible-page-header'
import HeaderViewToggle from './header/header-view-toggle'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { arrayMove } from '@dnd-kit/sortable'
import TaskSortSelect from '../lists/task-sort-select'
import { SidebarTrigger } from '../ui/sidebar'
import { waitForTaskExit } from '../tasks/task-item/task-item'
import {
  isTaskSortOption,
  sortTasks,
  type TaskSortOption,
} from '../lists/task-sorting'
import {
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
} from '../categories/actions'
import CreateTaskButton from '../tasks/create-task/create-task-button'
import CreateTaskAction from '../tasks/create-task/create-task-action'
import AgendaToggle from '@/components/agenda/agenda-toggle'
import { ListEmoji } from '../lists/list-emoji'
import Header from './header/app-header'
import { applyTaskOrganizationChange } from '@/lib/tasks'
import type { TaskCreationView } from '@/lib/task-creation'
import { localDateKey } from '@/lib/today'
import EventList from '@/components/lists/event-list'
import {
  EVENTS_CHANGED,
  eventVisualMutationFromEvent,
} from '@/components/events/mutations'
import {
  LISTS_CHANGED,
  listMutationFromEvent,
} from '@/components/lists/mutations'
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
  notifyCategoriesChanged,
} from '@/components/categories/mutations'

interface TaskWorkspaceProps {
  tasks: TaskWithList[]
  lists: List[]
  listId: string | null
  categories?: Category[]
  currentView: 'list' | 'board'
  headerTitle: string
  headerEmoji?: string | null
  events?: CalendarEventWithList[]
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

async function decryptEvents(events: CalendarEventWithList[], masterKey: Uint8Array) {
  return Promise.all(events.map(async (event) => ({
    ...event,
    title: await decryptString(event.title, masterKey),
    description: event.description ? await decryptString(event.description, masterKey) : event.description,
    location: event.location ? await decryptString(event.location, masterKey) : event.location,
    list: event.list ? {
      ...event.list,
      title: await decryptString(event.list.title, masterKey),
      emoji: event.list.emoji ? await decryptString(event.list.emoji, masterKey) : event.list.emoji,
    } : null,
  })))
}

export default function TaskWorkspace({
  tasks,
  lists,
  listId,
  categories,
  currentView,
  headerTitle,
  headerEmoji,
  events = [],
}: TaskWorkspaceProps) {
  const [localView, setLocalView] = useState(currentView)
  const [localTasks, setLocalTasks] = useState(tasks)
  const [localLists, setLocalLists] = useState(lists)
  const [localCategories, setLocalCategories] = useState<Category[]>([])
  const [localEvents, setLocalEvents] = useState<CalendarEventWithList[]>(events)
  const [localHeaderTitle, setLocalHeaderTitle] = useState(headerTitle)
  // Keep encrypted emoji ciphertext out of the first render until the vault
  // has decrypted the list data on the client.
  const [localHeaderEmoji, setLocalHeaderEmoji] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<TaskSortOption>('manual')

  const { masterKey } = useE2EE()
  const pathName = usePathname()
  const sortStorageKey = listId ? `planomy:list-sort:${listId}` : null
  const taskLoadVersion = useRef(0)
  const listScrollRootRef = useRef<HTMLDivElement>(null)
  const taskView = pathName === '/completed' ? 'completed' : 'all'
  const creationView: TaskCreationView = listId
    ? { type: 'list', listId }
    : { type: taskView }

  const refreshTasks = useCallback(async () => {
    if (!masterKey) return

    const request = ++taskLoadVersion.current

    try {
      const nextTasks = listId
        ? await getListTasks(listId)
        : await getTasks(taskView)
      const [decryptedTasks, decryptedEvents] = await Promise.all([
        decryptTasks(nextTasks, masterKey),
        listId ? getListEvents(listId).then((value) => decryptEvents(value, masterKey)) : Promise.resolve([]),
      ])

      if (request === taskLoadVersion.current) {
        setLocalTasks(decryptedTasks)
        setLocalEvents(decryptedEvents)
      }
    } catch (error) {
      if (request === taskLoadVersion.current) {
        console.error('Failed to refresh task workspace', error)
      }
    }
  }, [listId, masterKey, taskView])

  useEffect(() => {
    const handleTasksChanged = (event: Event) => {
      const change = taskVisualMutationFromEvent(event)
      if (change) {
        setLocalTasks((current) =>
          change.occurrenceId
            ? current
            : current.map((task) => applyTaskVisualMutation(task, change, localLists)),
        )
        if (!change.phase) void refreshTasks()
        return
      }
      void refreshTasks()
    }
    const handleEventsChanged = (event: Event) => {
      const change = eventVisualMutationFromEvent(event)
      if (change) {
        setLocalEvents((current) =>
          current.map((item) => applyEventVisualMutation(item, change, localLists)),
        )
        if (!change.phase) void refreshTasks()
        return
      }
      void refreshTasks()
    }
    const handleListsChanged = (event: Event) => {
      const change = listMutationFromEvent(event)
      if (!change) {
        void refreshTasks()
        return
      }

      setLocalLists((current) => current.map((list) => applyListMutationToList(list, change)))
      setLocalTasks((current) => current.map((task) => applyListMutationToTask(task, change)))
      setLocalEvents((current) => current.map((item) => applyListMutationToEvent(item, change)))
      if (listId === change.listId) {
        if (change.title !== undefined) setLocalHeaderTitle(change.title)
        if (change.emoji !== undefined) setLocalHeaderEmoji(change.emoji)
      }
      if (!change.phase) void refreshTasks()
    }
    const handleCategoriesChanged = (event: Event) => {
      const change = categoryVisualMutationFromEvent(event)
      if (!change) {
        void refreshTasks()
        return
      }
      setLocalCategories((current) => current.map((category) => applyCategoryMutationToCategory(category, change)))
      setLocalTasks((current) => current.map((task) => applyCategoryMutationToTask(task, change)))
      setLocalEvents((current) => current.map((item) => applyCategoryMutationToEvent(item, change)))
      if (!change.phase) void refreshTasks()
    }
    const handleTaskOrganizationChanged = (event: Event) => {
      const change = taskOrganizationChangeFromEvent(event)
      if (!change) return

      taskLoadVersion.current++
      setLocalTasks((current) =>
        current.map((task) =>
          applyTaskOrganizationChange(task, localLists, change),
        ),
      )
    }

    window.addEventListener(TASKS_CHANGED, handleTasksChanged)
    window.addEventListener(EVENTS_CHANGED, handleEventsChanged)
    window.addEventListener(LISTS_CHANGED, handleListsChanged)
    window.addEventListener(CATEGORIES_CHANGED, handleCategoriesChanged)
    window.addEventListener(
      TASK_ORGANIZATION_CHANGED,
      handleTaskOrganizationChanged,
    )
    return () => {
      window.removeEventListener(TASKS_CHANGED, handleTasksChanged)
      window.removeEventListener(EVENTS_CHANGED, handleEventsChanged)
      window.removeEventListener(LISTS_CHANGED, handleListsChanged)
      window.removeEventListener(CATEGORIES_CHANGED, handleCategoriesChanged)
      window.removeEventListener(
        TASK_ORGANIZATION_CHANGED,
        handleTaskOrganizationChanged,
      )
    }
  }, [listId, localLists, refreshTasks])

  useEffect(() => {
    if (!sortStorageKey) return

    const savedSortOption = window.localStorage.getItem(sortStorageKey)
    const timeoutId = window.setTimeout(() => {
      setSortOption(
        savedSortOption && isTaskSortOption(savedSortOption)
          ? savedSortOption
          : 'manual',
      )
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [sortStorageKey])

  const workspaceTasks = useMemo(
    () =>
      listId
        ? localTasks.filter((task) => task.list_id === listId)
        : localTasks,
    [listId, localTasks],
  )
  const displayedTasks = useMemo(
    () => sortTasks(workspaceTasks, sortOption),
    [sortOption, workspaceTasks],
  )
  const canReorderTasks =
    sortOption === 'manual' &&
    (pathName === '/inbox' || pathName.startsWith('/lists/'))

  function handleSortChange(nextSortOption: TaskSortOption) {
    setSortOption(nextSortOption)
    if (sortStorageKey) {
      window.localStorage.setItem(sortStorageKey, nextSortOption)
    }
  }

  useEffect(() => {
    if (!masterKey) return

    const unlockedMasterKey = masterKey
    let isCancelled = false
    const request = ++taskLoadVersion.current

    async function decryptLoadedData() {
      const [decryptedTasks, decryptedLists, decryptedCategories, decryptedEvents] =
        await Promise.all([
          decryptTasks(tasks, unlockedMasterKey),
          decryptLists(lists, unlockedMasterKey),
          decryptCategories(categories ?? [], unlockedMasterKey),
          decryptEvents(events, unlockedMasterKey),
        ])

      const decryptedHeaderTitle = await decryptString(headerTitle, unlockedMasterKey)
      const decryptedHeaderEmoji = headerEmoji
        ? await decryptString(headerEmoji, unlockedMasterKey)
        : null

      if (!isCancelled && request === taskLoadVersion.current) {
        setLocalTasks(decryptedTasks)
        setLocalLists(decryptedLists)
        setLocalCategories(decryptedCategories)
        setLocalEvents(decryptedEvents)
        setLocalHeaderTitle(decryptedHeaderTitle)
        setLocalHeaderEmoji(decryptedHeaderEmoji)
      }
    }

    decryptLoadedData().catch((error) => {
      console.error('Failed to decrypt loaded data', error)
    })

    return () => {
      isCancelled = true
    }
  }, [events, masterKey, tasks, lists, categories, headerTitle, headerEmoji])

  async function handleOnComplete(taskId: string, isCompleted: boolean) {
    const previousTasks = localTasks
    const task = localTasks.find((candidate) => candidate.id === taskId)
    const recurringCompletion = isCompleted && Boolean(task?.recurrence_rule)

    // update the local tasks
    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: recurringCompletion ? false : isCompleted }
          : task,
      ),
    )

    // Remove only after persistence; an old fade timer must not erase a rollback.
    try {
      const result = await updateTaskCompletedAction(taskId, isCompleted, localDateKey())
      const finalCompleted = result.recurring ? result.taskCompleted : isCompleted

      const shouldRemove = finalCompleted !== (pathName === '/completed')
      if (shouldRemove && finalCompleted) {
        await waitForTaskExit()
      }

      if (shouldRemove) {
        setLocalTasks((previous) =>
          previous.filter((task) => task.id !== taskId),
        )
      }

      notifyTasksChanged()
    } catch (error) {
      setLocalTasks(previousTasks)
      toast.error(error instanceof Error ? error.message : 'Completion was not saved.')
    }
  }

  function handleOnRename(taskId: string, newTitle: string) {
    const previousTasks = localTasks

    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, title: newTitle } : task,
      ),
    )

    if (!masterKey) {
      setLocalTasks(previousTasks)
      console.error('Encryption key is locked.')
      return
    }

    const unlockedMasterKey = masterKey

    encryptString(newTitle, unlockedMasterKey)
      .then((encryptedTitle) => renameTask(taskId, encryptedTitle))
      .catch((error) => {
        setLocalTasks(previousTasks)
        console.error(error)
      })
  }

  function handleOnDueDateChange(taskId: string, newDueDate: string) {
    const previousTasks = localTasks

    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, due_date: newDueDate } : task,
      ),
    )

    updateTaskDueDate(taskId, newDueDate).catch((error) => {
      setLocalTasks(previousTasks)
      console.error(error)
    })
  }

  function handleOnNotesChange(taskId: string, notes: string) {
    const previousTasks = localTasks

    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, notes: notes } : task,
      ),
    )

    if (!masterKey) {
      setLocalTasks(previousTasks)
      console.error('Encryption key is locked.')
      return
    }

    const unlockedMasterKey = masterKey

    encryptString(notes, unlockedMasterKey)
      .then((encryptedNotes) => updateTaskNotes(taskId, encryptedNotes))
      .catch((error) => {
        setLocalTasks(previousTasks)
        console.error(error)
      })
  }

  function handleOnDelete(taskId: string) {
    const previousTasks = localTasks

    setLocalTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId))

    deleteTask(taskId).catch((error) => {
      setLocalTasks(previousTasks)
      console.error(error, 'Something went wrong')
    })
  }

  async function handleOnCreateCategory(title: string, color: ListColor | null) {
    if (!listId) throw new Error('Categories belong to a specific list.')
    if (!masterKey) throw new Error('Encryption key is locked.')

    const encryptedTitle = await encryptString(title.trim(), masterKey)
    const savedCategory = await createCategory(listId, encryptedTitle, color)
    const decryptedTitle = await decryptString(savedCategory.title, masterKey)

    setLocalCategories((previousCategories) =>
      [...previousCategories, { ...savedCategory, color, title: decryptedTitle }].sort(
        (a, b) => a.position - b.position,
      ),
    )
  }

  async function handleOnRenameCategory(category: Category, title: string, color: ListColor | null) {
    if (!listId) throw new Error('Categories belong to a specific list.')
    if (!masterKey) throw new Error('Encryption key is locked.')

    const previousCategories = localCategories
    setLocalCategories((currentCategories) => currentCategories.map((currentCategory) =>
      currentCategory.id === category.id ? { ...currentCategory, title, color } : currentCategory,
    ))
    notifyCategoriesChanged({ categoryId: category.id, listId: category.list_id, color, phase: 'optimistic' })

    try {
      const encryptedTitle = await encryptString(title.trim(), masterKey)
      await renameCategory(listId, category.id, encryptedTitle, color)
      notifyCategoriesChanged({ categoryId: category.id, listId: category.list_id, color })
    } catch (error) {
      setLocalCategories(previousCategories)
      notifyCategoriesChanged({ categoryId: category.id, listId: category.list_id, color: category.color ?? null, phase: 'rollback' })
      throw error
    }
  }

  async function handleOnDeleteCategory(category: Category) {
    if (!listId) throw new Error('Categories belong to a specific list.')

    const previousCategories = localCategories
    const previousTasks = localTasks
    const previousEvents = localEvents
    setLocalCategories((currentCategories) =>
      currentCategories.filter(
        (currentCategory) => currentCategory.id !== category.id,
      ),
    )
    setLocalTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.category_id === category.id
          ? { ...task, category_id: null, category: null }
          : task,
      ),
    )
    setLocalEvents((currentEvents) => currentEvents.map((event) =>
      event.category_id === category.id ? { ...event, category_id: null, category: null } : event,
    ))

    try {
      await deleteCategory(listId, category.id)
    } catch (error) {
      setLocalCategories(previousCategories)
      setLocalTasks(previousTasks)
      setLocalEvents(previousEvents)
      throw error
    }
  }

  async function handleOnMoveCategory(
    category: Category,
    direction: 'up' | 'down',
  ) {
    if (!listId) throw new Error('Categories belong to a specific list.')

    const previousCategories = localCategories
    const sortedCategories = [...localCategories].sort(
      (a, b) => a.position - b.position,
    )
    const currentIndex = sortedCategories.findIndex(
      (currentCategory) => currentCategory.id === category.id,
    )
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= sortedCategories.length
    ) {
      return
    }

    const reorderedCategories = arrayMove(
      sortedCategories,
      currentIndex,
      nextIndex,
    ).map((currentCategory, position) => ({
      ...currentCategory,
      position,
    }))

    setLocalCategories(reorderedCategories)

    try {
      await reorderCategories(
        listId,
        reorderedCategories.map(({ id, position }) => ({ id, position })),
      )
    } catch (error) {
      setLocalCategories(previousCategories)
      throw error
    }
  }

  async function handleOnChangeCategory(
    taskId: string,
    categoryId: string | null,
  ) {
    const previousTasks = localTasks
    const nextCategory = categoryId ? localCategories.find((category) => category.id === categoryId) : null
    setLocalTasks((currentTasks) => currentTasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            category_id: categoryId,
            category: nextCategory ? { id: nextCategory.id, list_id: nextCategory.list_id, color: nextCategory.color ?? null } : null,
          }
        : task,
    ))
    notifyTaskOrganizationChanged({
      taskId,
      listId: localTasks.find((task) => task.id === taskId)?.list_id ?? listId,
      categoryId,
      category: nextCategory ? { id: nextCategory.id, list_id: nextCategory.list_id, color: nextCategory.color ?? null } : null,
    })

    try {
      await changeTaskCategory(taskId, categoryId)
    } catch (error) {
      setLocalTasks(previousTasks)
      throw error
    }
  }

  // Reordering
  function handleOnReorder(activeId: string, overId: string) {
    if (activeId === overId) return

    const previousTasks = localTasks

    const oldIndex = localTasks.findIndex((task) => task.id == activeId)
    const newIndex = localTasks.findIndex((task) => task.id === overId)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedTasks = arrayMove(localTasks, oldIndex, newIndex)

    setLocalTasks(reorderedTasks)

    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      position: index,
    }))

    reorderTasks(updates).catch((error) => {
      console.log(error)
      setLocalTasks(previousTasks)
    })
  }

  const isListPage = listId !== null
  const usesPageHeader = isListPage || pathName === '/completed'
  const workspaceContent = (
    <div
      className={
        usesPageHeader
          ? 'flex min-w-0 flex-col gap-4 p-4'
          : 'flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4'
      }
    >
      {listId ? <EventList events={localEvents} lists={localLists} categories={localCategories} listId={listId} /> : null}

      {workspaceTasks.length === 0 && pathName === '/inbox' && (
        <p>Nothing in Unsorted. Capture a task or enjoy the silence.</p>
      )}

      {workspaceTasks.length === 0 && pathName === '/all' && (
        <p>No tasks yet. Every good plan starts with one.</p>
      )}
      {workspaceTasks.length === 0 && pathName === '/completed' && (
        <p>No completed tasks yet. Go plan something awesome.</p>
      )}
      {workspaceTasks.length === 0 && pathName.includes('/lists/') && (
        <p>This list is empty. Add a task to stay organized.</p>
      )}

      <div
        className={
          usesPageHeader ? 'min-w-0' : 'min-h-0 min-w-0 flex-1 overflow-hidden'
        }
      >
        <Suspense
          fallback={
            <div className="flex w-full max-w-xs flex-col gap-7">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          }
        >
          {localView === 'list' ? (
            <TaskList
              localTasks={displayedTasks}
              localLists={localLists}
              currentListId={listId}
              handleOnReorder={handleOnReorder}
              canReorder={canReorderTasks}
              handleOnComplete={handleOnComplete}
              handleOnRename={handleOnRename}
              handleOnDueDateChange={handleOnDueDateChange}
              handleOnNotesChange={handleOnNotesChange}
              handleOnDelete={handleOnDelete}
              pathName={pathName}
              categories={listId ? localCategories : undefined}
              listColor={listId ? localLists.find((list) => list.id === listId)?.color : undefined}
              handleOnChangeCategory={listId ? handleOnChangeCategory : undefined}
              handleOnCreateCategory={
                listId ? handleOnCreateCategory : undefined
              }
              handleOnRenameCategory={
                listId ? handleOnRenameCategory : undefined
              }
              handleOnDeleteCategory={
                listId ? handleOnDeleteCategory : undefined
              }
              handleOnMoveCategory={
                listId ? handleOnMoveCategory : undefined
              }
              pageScroll={usesPageHeader}
            />
          ) : (
            <TaskBoard
              tasks={workspaceTasks}
              categories={localCategories}
              listColor={localLists.find((list) => list.id === listId)?.color ?? 'blue'}
              onTaskCategoryChange={handleOnChangeCategory}
              onCreateCategory={handleOnCreateCategory}
              onRenameCategory={handleOnRenameCategory}
              onDeleteCategory={handleOnDeleteCategory}
              onMoveCategory={handleOnMoveCategory}
              pageScroll={usesPageHeader}
            />
          )}
        </Suspense>
      </div>
    </div>
  )

  if (usesPageHeader) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div
          ref={listScrollRootRef}
          className="min-h-0 flex-1 overflow-y-auto bg-background px-4 pb-5 pt-0 sm:px-6 sm:pb-6 sm:pt-8 lg:px-8"
        >
          <CollapsiblePageHeader
            headerTitle={localHeaderTitle}
            taskCount={workspaceTasks.length}
            headerEmoji={localHeaderEmoji}
            scrollRootRef={listScrollRootRef}
            rightSlot={(isCollapsed) => (
              <CreateTaskAction
                creationView={creationView}
                lists={localLists}
                categories={localCategories}
                listId={listId}
                compact
                interactive={isCollapsed}
              />
            )}
          >
            <div className="mx-auto w-full max-w-360">
              <div className="mb-5 flex min-w-0 flex-col gap-4 py-2 sm:py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger className="mt-1 md:hidden" />
                  {listId && (
                    <span className="flex size-[clamp(2rem,4vw,3.25rem)] shrink-0 items-center justify-center">
                      <ListEmoji
                        emoji={localHeaderEmoji}
                        className="size-full items-center justify-center text-[clamp(2rem,4vw,3.25rem)]"
                      />
                    </span>
                  )}
                  <h1 className="min-w-0 break-words font-heading text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em] text-foreground">
                    {localHeaderTitle}
                  </h1>
                </div>
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                  {localView === 'list' && (
                    <TaskSortSelect
                      value={sortOption}
                      onValueChange={handleSortChange}
                      iconOnlyOnMobile
                    />
                  )}
                  {listId && (
                    <HeaderViewToggle
                      listId={listId}
                      currentView={currentView}
                      localView={localView}
                      setLocalView={setLocalView}
                    />
                  )}
                  <CreateTaskAction
                    creationView={creationView}
                    lists={localLists}
                    categories={localCategories}
                    listId={listId}
                    className="sm:ml-auto"
                  />
                  <AgendaToggle />
                </div>
              </div>
            </div>
          </CollapsiblePageHeader>

          <div className="mx-auto w-full max-w-360">
            {workspaceContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header taskCount={workspaceTasks.length} headerTitle={localHeaderTitle} />
      {workspaceContent}
      <CreateTaskButton
        creationView={creationView}
        listId={null}
        lists={localLists}
        categories={localCategories}
      />
    </>
  )
}
