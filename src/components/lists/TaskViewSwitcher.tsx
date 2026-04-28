'use client'

import { List, Status, TaskWithList } from '@/types'
import ListBoardToggle from './ListBoardToggle'
import { Suspense, useState } from 'react'
import TaskList from './TaskList'
import TaskBoard from '../boards/TaskBoard'

interface TaskViewSwitcherProps {
  tasks: TaskWithList[]
  lists: List[]
  listId: string
  statuses: Status[]
  currentView: 'list' | 'board'
}

export default function TaskViewSwitcher({
  tasks,
  lists,
  listId,
  statuses,
  currentView,
}: TaskViewSwitcherProps) {
  const [view, setView] = useState(currentView)
  return (
    <>
      <ListBoardToggle
        listId={listId}
        currentView={currentView}
        setView={setView}
        view={view}
      />

      {tasks.length === 0 ? (
        <p>This list is empty. Click '+' to add your first task.</p>
      ) : (
        <Suspense fallback={<h1>Loading tasks...</h1>}>
          {view === 'list' ? (
            <TaskList tasks={tasks} lists={lists} currentListId={listId} />
          ) : (
            <TaskBoard
              tasks={tasks}
              statuses={statuses}
              lists={lists}
              currentListId={listId}
            />
          )}
        </Suspense>
      )}
    </>
  )
}
