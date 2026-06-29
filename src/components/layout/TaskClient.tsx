'use client'

import { List, Status, TaskWithList } from '@/types'
import { Suspense, useEffect, useState } from 'react'
import TaskList from '../lists/TaskList'
import TaskBoard from '../boards/TaskBoard'
import {
  createTask,
  deleteTask,
  renameTask,
  updateTaskCompleted,
  updateTaskDueDate,
  updateTaskNotes,
} from '../tasks/actions'
import CreateTaskButton from '../tasks/create-task/CreateTaskButton'
import { Skeleton } from '../ui/skeleton'
import { usePathname } from 'next/navigation'
import Header from './header/Header'
import HeaderViewToggle from './header/HeaderViewToggle'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString, encryptString } from '@/lib/crypto/e2ee'

interface TaskClientProps {
  tasks: TaskWithList[]
  lists: List[]
  listId: string | null
  statuses?: Status[]
  currentView: 'list' | 'board'
  headerTitle: string
}

export default function TaskClient({
  tasks,
  lists,
  listId,
  statuses,
  currentView,
  headerTitle,
}: TaskClientProps) {
  const [localView, setLocalView] = useState(currentView)
  const [localTasks, setLocalTasks] = useState(tasks)
  const [localLists, setLocalLists] = useState(lists)
  const [localHeaderTitle, setLocalHeaderTitle] = useState(headerTitle)

  const { masterKey } = useE2EE()
  const pathName = usePathname()

  useEffect(() => {
    if (!masterKey) return

    const unlockedMasterKey = masterKey
    let isCancelled = false

    async function decryptLoadedData() {
      const decryptedTasks = await Promise.all(
        tasks.map(async (task) => ({
          ...task,
          title: await decryptString(task.title, unlockedMasterKey),
          notes: task.notes
            ? await decryptString(task.notes, unlockedMasterKey)
            : task.notes,
          list: task.list
            ? {
                ...task.list,
                title: await decryptString(task.list.title, unlockedMasterKey),
              }
            : task.list,
        })),
      )

      const decryptedLists = await Promise.all(
        lists.map(async (list) => ({
          ...list,
          title: await decryptString(list.title, unlockedMasterKey),
        })),
      )

      const decryptedHeaderTitle = await decryptString(
        headerTitle,
        unlockedMasterKey,
      )

      if (!isCancelled) {
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
  }, [masterKey, tasks])

  async function handleOnCreate(
    title: string,
    dueDate: string,
    notes: string,
    listId: string | null,
  ) {
    const tempId = `temp-${crypto.randomUUID()}`
    console.log(listId)
    const tempTask: TaskWithList = {
      id: tempId,
      title,
      due_date: dueDate,
      notes,
      list_id: listId,
      user_id: 'temp',
      completed: false,
      list: null,
    }

    setTimeout(() => {
      setLocalTasks((prevTasks) => [...prevTasks, tempTask])
    }, 300)

    try {
      if (!masterKey) {
        throw new Error('Encryption key is locked.')
      }

      const encryptedTitle = await encryptString(title, masterKey)
      const encryptedNotes = await encryptString(notes, masterKey)

      const savedTask = await createTask(
        encryptedTitle,
        dueDate,
        encryptedNotes,
        listId,
      )

      if (!savedTask) {
        throw new Error('Task was not created')
      }

      setLocalTasks((prev) =>
        prev.map((task) =>
          task.id === tempId
            ? {
                ...savedTask,
                title,
                notes,
              }
            : task,
        ),
      )
    } catch (error) {
      setLocalTasks((prev) => prev.filter((task) => task.id !== tempId))
      console.error(error)
    }
  }

  function handleOnComplete(taskId: string, isCompleted: boolean) {
    const previousTasks = localTasks

    // update the local tasks
    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: isCompleted } : task,
      ),
    )

    // if task is completed, fade it out
    if (isCompleted) {
      setTimeout(() => {
        setLocalTasks((prev) => prev.filter((task) => task.id !== taskId))
      }, 200)
    }

    if (!isCompleted && pathName === '/completed') {
      setLocalTasks((prev) => prev.filter((task) => task.completed))
    }

    // update database, revert if error
    updateTaskCompleted(taskId, isCompleted).catch((error) => {
      setLocalTasks(previousTasks)
      console.error(error)
    })
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

  return (
    <>
      <Header
        taskCount={localTasks.length}
        headerTitle={localHeaderTitle}
        rightSlot={
          listId && (
            <HeaderViewToggle
              listId={listId}
              currentView={currentView}
              localView={localView}
              setLocalView={setLocalView}
            />
          )
        }
      />
      {localTasks.length === 0 && pathName === '/inbox' && (
        <p>Nothing in your inbox. Capture a task or enjoy the silence.</p>
      )}

      {localTasks.length === 0 && pathName === '/today' && (
        <p>Nothing due today. Take it easy.</p>
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
              localTasks={localTasks}
              localLists={localLists}
              currentListId={listId}
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
      <CreateTaskButton handleOnCreate={handleOnCreate} listId={listId} />
    </>
  )
}
