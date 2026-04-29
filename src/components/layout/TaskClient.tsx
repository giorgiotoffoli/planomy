'use client'

import { List, Status, TaskWithList } from '@/types'
import ListBoardToggle from '../lists/ListBoardToggle'
import { Suspense, useState } from 'react'
import TaskList from '../lists/TaskList'
import TaskBoard from '../boards/TaskBoard'
import { renameTask, updateTaskCompleted } from '../tasks/actions'

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

  function handleOnDelete() {}

  function handleOnDateChange() {}

  function handleOnNoteChange() {}

  return (
    <>
      {listId && (
        <ListBoardToggle
          listId={listId!}
          currentView={currentView!}
          setLocalView={setLocalView}
          localView={localView!}
        />
      )}
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        {localView === 'list' ? (
          <TaskList
            localTasks={localTasks}
            lists={lists}
            currentListId={listId}
            handleOnComplete={handleOnComplete}
            handleOnRename={handleOnRename}
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
    </>
  )
}
