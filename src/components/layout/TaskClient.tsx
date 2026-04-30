'use client'

import { List, Status, TaskWithList } from '@/types'
import ListBoardToggle from '../lists/ListBoardToggle'
import { Suspense, useState } from 'react'
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

interface TaskClientProps {
  tasks: TaskWithList[]
  lists: List[]
  listId?: string
  statuses?: Status[]
  currentView: 'list' | 'board'
}

export default function TaskClient({
  tasks,
  lists,
  listId,
  statuses,
  currentView,
}: TaskClientProps) {
  const [localView, setLocalView] = useState(currentView)
  const [localTasks, setLocalTasks] = useState(tasks)

  async function handleOnCreate(
    title: string,
    dueDate: string,
    notes: string,
    listId: string,
  ) {
    const tempId = `temp-${crypto.randomUUID()}`

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
      const savedTask = await createTask(title, dueDate, notes, listId)

      if (!savedTask) {
        throw new Error('Task was not created')
      }
      setLocalTasks((prev) =>
        prev.map((task) => (task.id === tempId ? savedTask : task)),
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

    renameTask(taskId, newTitle).catch((error) => {
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

    updateTaskNotes(taskId, notes).catch((error) => {
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
      {localTasks.length === 0 && (
        <p>Nothing in your inbox. Capture a task or enjoy the silence.</p>
      )}
      {listId && (
        <ListBoardToggle
          listId={listId!}
          currentView={currentView!}
          setLocalView={setLocalView}
          localView={localView!}
        />
      )}
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
            lists={lists}
            currentListId={listId}
            handleOnComplete={handleOnComplete}
            handleOnRename={handleOnRename}
            handleOnDueDateChange={handleOnDueDateChange}
            handleOnNotesChange={handleOnNotesChange}
            handleOnDelete={handleOnDelete}
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
      <CreateTaskButton handleOnCreate={handleOnCreate} />
    </>
  )
}
