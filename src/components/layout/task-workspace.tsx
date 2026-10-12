'use client'

import { Category, List, TaskWithList } from '@/types'
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
  TASKS_CHANGED,
  createTask,
  deleteTask,
  notifyTasksChanged,
  renameTask,
  reorderTasks,
  updateTaskDueDate,
  updateTaskNotes,
  changeTaskCategory,
} from '../tasks/mutations'
import { updateTaskCompleted as updateTaskCompletedAction } from '../tasks/actions'
import { getTasks } from '../tasks/queries'
import { getListTasks } from '../lists/queries'
import CreateTaskButton from '../tasks/create-task/create-task-button'
import { Skeleton } from '../ui/skeleton'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import Header from './header/app-header'
import HeaderViewToggle from './header/header-view-toggle'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'
import { arrayMove } from '@dnd-kit/sortable'
import TaskSortSelect from '../lists/task-sort-select'
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

interface TaskWorkspaceProps {
  tasks: TaskWithList[]
  lists: List[]
  listId: string | null
  categories?: Category[]
  currentView: 'list' | 'board'
  headerTitle: string
  headerEmoji?: string | null
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

export default function TaskWorkspace({
  tasks,
  lists,
  listId,
  categories,
  currentView,
  headerTitle,
  headerEmoji,
}: TaskWorkspaceProps) {
  const [localView, setLocalView] = useState(currentView)
  const [localTasks, setLocalTasks] = useState(tasks)
  const [localLists, setLocalLists] = useState(lists)
  const [localCategories, setLocalCategories] = useState<Category[]>([])
  const [localHeaderTitle, setLocalHeaderTitle] = useState(headerTitle)
  // Keep encrypted emoji ciphertext out of the first render until the vault
  // has decrypted the list data on the client.
  const [localHeaderEmoji, setLocalHeaderEmoji] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<TaskSortOption>('manual')

  const { masterKey } = useE2EE()
  const pathName = usePathname()
  const sortStorageKey = listId ? `planomy:list-sort:${listId}` : null
  const taskLoadVersion = useRef(0)
  const taskView = pathName === '/completed' ? 'completed' : 'scheduled'

  const refreshTasks = useCallback(async () => {
    if (!masterKey) return

    const request = ++taskLoadVersion.current

    try {
      const nextTasks = listId
        ? await getListTasks(listId)
        : await getTasks(taskView)
      const decryptedTasks = await decryptTasks(nextTasks, masterKey)

      if (request === taskLoadVersion.current) {
        setLocalTasks(decryptedTasks)
      }
    } catch (error) {
      if (request === taskLoadVersion.current) {
        console.error('Failed to refresh task workspace', error)
      }
    }
  }, [listId, masterKey, taskView])

  useEffect(() => {
    const handleTasksChanged = () => {
      void refreshTasks()
    }

    window.addEventListener(TASKS_CHANGED, handleTasksChanged)
    return () => window.removeEventListener(TASKS_CHANGED, handleTasksChanged)
  }, [refreshTasks])

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

  const displayedTasks = useMemo(
    () => sortTasks(localTasks, sortOption),
    [localTasks, sortOption],
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
      const [decryptedTasks, decryptedLists, decryptedCategories] =
        await Promise.all([
          decryptTasks(tasks, unlockedMasterKey),
          decryptLists(lists, unlockedMasterKey),
          decryptCategories(categories ?? [], unlockedMasterKey),
        ])

      const decryptedHeaderTitle = await decryptString(headerTitle, unlockedMasterKey)
      const decryptedHeaderEmoji = headerEmoji
        ? await decryptString(headerEmoji, unlockedMasterKey)
        : null

      if (!isCancelled && request === taskLoadVersion.current) {
        setLocalTasks(decryptedTasks)
        setLocalLists(decryptedLists)
        setLocalCategories(decryptedCategories)
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
  }, [masterKey, tasks, lists, categories, headerTitle, headerEmoji])

  async function handleOnCreate(
    title: string,
    dueDate: string,
    notes: string,
    selectedListId: string | null,
  ) {
    const tempId = `temp-${crypto.randomUUID()}`

    const shouldShowOnCurrentPage =
      pathName === '/all' ||
      (pathName === '/inbox' && selectedListId === null) ||
      (pathName.includes('/lists/') && selectedListId === listId) ||
      (pathName === '/scheduled' && Boolean(dueDate))

    const selectedList =
      localLists.find((list) => list.id === selectedListId) ?? null

    const tempTask: TaskWithList = {
      id: tempId,
      title,
      due_date: dueDate,
      due_time: null,
      notes,
      list_id: selectedListId,
      user_id: 'temp',
      completed: false,
      focused: false,
      stashed: false,
      category_id: null,
      list: selectedList,
      position: 0,
      created_at: null,
    }

    if (shouldShowOnCurrentPage) {
      setLocalTasks((previousTasks) => [tempTask, ...previousTasks])
    }

    try {
      if (!masterKey) {
        throw new Error('Encryption key is locked.')
      }

      const encryptedTitle = await encryptString(title, masterKey)
      const encryptedNotes = notes ? await encryptString(notes, masterKey) : ''

      const savedTask = await createTask(
        encryptedTitle,
        dueDate,
        encryptedNotes,
        selectedListId,
      )

      if (!savedTask) {
        throw new Error('Task was not created')
      }

      // Only replace the optimistic task if one was displayed.
      if (shouldShowOnCurrentPage) {
        setLocalTasks((previousTasks) =>
          previousTasks.map((task) =>
            task.id === tempId
              ? {
                  ...savedTask,
                  title,
                  notes,
                  list_id: selectedListId,
                  list: selectedList,
                }
              : task,
          ),
        )
      }
    } catch (error) {
      if (shouldShowOnCurrentPage) {
        setLocalTasks((previousTasks) =>
          previousTasks.filter((task) => task.id !== tempId),
        )
      }

      console.error(error)
    }
  }
  async function handleOnComplete(taskId: string, isCompleted: boolean) {
    const previousTasks = localTasks

    // update the local tasks
    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: isCompleted } : task,
      ),
    )

    // Remove only after persistence; an old fade timer must not erase a rollback.
    try {
      await updateTaskCompletedAction(taskId, isCompleted)

      const shouldRemove = isCompleted !== (pathName === '/completed')
      if (shouldRemove && isCompleted) {
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

  async function handleOnCreateCategory(title: string) {
    if (!listId) throw new Error('Categories belong to a specific list.')
    if (!masterKey) throw new Error('Encryption key is locked.')

    const encryptedTitle = await encryptString(title.trim(), masterKey)
    const savedCategory = await createCategory(listId, encryptedTitle)
    const decryptedTitle = await decryptString(savedCategory.title, masterKey)

    setLocalCategories((previousCategories) =>
      [...previousCategories, { ...savedCategory, title: decryptedTitle }].sort(
        (a, b) => a.position - b.position,
      ),
    )
  }

  async function handleOnRenameCategory(category: Category, title: string) {
    if (!listId) throw new Error('Categories belong to a specific list.')
    if (!masterKey) throw new Error('Encryption key is locked.')

    const previousCategories = localCategories
    setLocalCategories((currentCategories) =>
      currentCategories.map((currentCategory) =>
        currentCategory.id === category.id
          ? { ...currentCategory, title }
          : currentCategory,
      ),
    )

    try {
      const encryptedTitle = await encryptString(title.trim(), masterKey)
      await renameCategory(listId, category.id, encryptedTitle)
    } catch (error) {
      setLocalCategories(previousCategories)
      throw error
    }
  }

  async function handleOnDeleteCategory(category: Category) {
    if (!listId) throw new Error('Categories belong to a specific list.')

    const previousCategories = localCategories
    const previousTasks = localTasks
    setLocalCategories((currentCategories) =>
      currentCategories.filter(
        (currentCategory) => currentCategory.id !== category.id,
      ),
    )
    setLocalTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.category_id === category.id
          ? { ...task, category_id: null }
          : task,
      ),
    )

    try {
      await deleteCategory(listId, category.id)
    } catch (error) {
      setLocalCategories(previousCategories)
      setLocalTasks(previousTasks)
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
    setLocalTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, category_id: categoryId } : task,
      ),
    )

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

  return (
    <>
      <Header
        taskCount={localTasks.length}
        headerTitle={localHeaderTitle}
        headerEmoji={listId ? localHeaderEmoji : undefined}
        rightSlot={
          listId && (
            <div className="flex items-center gap-2">
              {localView === 'list' && (
                <TaskSortSelect
                  value={sortOption}
                  onValueChange={handleSortChange}
                  iconOnlyOnMobile
                />
              )}
              <HeaderViewToggle
                listId={listId}
                currentView={currentView}
                localView={localView}
                setLocalView={setLocalView}
              />
            </div>
          )
        }
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        {localTasks.length === 0 && pathName === '/inbox' && (
          <p>Nothing in your inbox. Capture a task or enjoy the silence.</p>
        )}

        {localTasks.length === 0 && pathName === '/scheduled' && (
          <p>No upcoming tasks. Future you is chilling.</p>
        )}
        {localTasks.length === 0 && pathName === '/all' && (
          <p>No tasks yet. Every good plan starts with one.</p>
        )}
        {localTasks.length === 0 && pathName === '/completed' && (
          <p>No completed tasks yet. Go plan something awesome.</p>
        )}
        {localTasks.length === 0 && pathName.includes('/lists/') && (
          <p>This list is empty. Add a task to stay organized.</p>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
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
              />
            ) : (
              <TaskBoard
                tasks={localTasks}
                categories={localCategories}
                onTaskCategoryChange={handleOnChangeCategory}
                onCreateCategory={handleOnCreateCategory}
                onRenameCategory={handleOnRenameCategory}
                onDeleteCategory={handleOnDeleteCategory}
                onMoveCategory={handleOnMoveCategory}
              />
            )}
          </Suspense>
        </div>
      </div>
      <CreateTaskButton
        handleOnCreate={handleOnCreate}
        listId={listId}
        lists={localLists}
      />
    </>
  )
}
