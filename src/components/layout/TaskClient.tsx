'use client'

import { List, Status, TaskWithList } from '@/types'
import ListBoardToggle from '../lists/ListBoardToggle'
import { Suspense, useState } from 'react'
import TaskList from '../lists/TaskList'
import TaskBoard from '../boards/TaskBoard'

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
  return (
    <>
      {listId != '' && (
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
