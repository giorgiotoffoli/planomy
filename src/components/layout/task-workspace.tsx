'use client'

import { List, Status, TaskWithList } from '@/types'
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
  renameTask,
  reorderTasks,
  updateTaskCompleted,
  updateTaskDueDate,
  updateTaskNotes,
} from '../tasks/mutations'
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
import {
  isTaskSortOption,
  sortTasks,
  type TaskSortOption,
} from '../lists/task-sorting'

interface TaskWorkspaceProps {
  tasks: TaskWithList[]
  lists: List[]
  listId: string | null
  statuses?: Status[]
  currentView: 'list' | 'board'
  headerTitle: string
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
    })),
  )
}

export default function TaskWorkspace({
  tasks,
  lists,
  listId,
  statuses,
  currentView,
  headerTitle,
}: TaskWorkspaceProps) {
  const [localView, setLocalView] = useState(currentView)
  const [localTasks, setLocalTasks] = useState(tasks)
  const [localLists, setLocalLists] = useState(lists)
  const [localHeaderTitle, setLocalHeaderTitle] = useState(headerTitle)
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
      const [decryptedTasks, decryptedLists] = await Promise.all([
        decryptTasks(tasks, unlockedMasterKey),
        decryptLists(lists, unlockedMasterKey),
      ])

      const decryptedHeaderTitle = await decryptString(
        headerTitle,
        unlockedMasterKey,
      )

      if (!isCancelled && request === taskLoadVersion.current) {
        setLocalTasks(decryptedTasks)
        setLocalLists(decryptedLists)
        setLocalHeaderTitle(decryptedHeaderTitle)
      }
    }

    decryptLoadedData().catch((error) => {
      console.error('Failed to decrypt loaded data', error)
    })

    return () => {
      isCancelled = true
    }
  }, [masterKey, tasks, lists, headerTitle])

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
      await updateTaskCompleted(taskId, isCompleted)
      if (isCompleted !== (pathName === '/completed')) {
        setLocalTasks(previous => previous.filter(task => task.id !== taskId))
      }
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
        rightSlot={
          listId && (
            <div className="flex items-center gap-2">
              {localView === 'list' && (
                <TaskSortSelect
                  value={sortOption}
                  onValueChange={handleSortChange}
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
              />
            ) : (
              <TaskBoard
                tasks={localTasks}
                statuses={statuses!}
                lists={lists}
                currentListId={listId!}
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
