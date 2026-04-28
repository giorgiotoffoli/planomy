'use client'
import BoardColumn from '@/components/boards/BoardColumn'
import { List, Status, TaskWithList } from '../../types'
import { DragDropProvider } from '@dnd-kit/react'
import { useState } from 'react'
import { changeTaskStatus } from '../tasks/actions'
import type { DragDropEvents } from '@dnd-kit/react'

type DragEndEvent = Parameters<DragDropEvents['dragend']>[0]

interface TaskBoardProps {
  tasks: TaskWithList[]
  statuses: Status[]
  lists: List[]
  currentListId: string
}

export default function TaskBoard({
  tasks,
  statuses,
  lists,
  currentListId,
}: TaskBoardProps) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const numsOfStatus = statuses.length + 1
  const sortedStatuses = [...statuses].sort((a, b) => a.position - b.position)

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return

    const taskId = event.operation.source?.id as string | undefined
    const targetId = event.operation.target?.id as string | undefined

    if (!taskId || !targetId) return

    const newStatusId = targetId === 'unassigned' ? null : targetId
    const previousTasks = localTasks

    requestAnimationFrame(() => {
      setLocalTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status_id: newStatusId } : task,
        ),
      )
    })

    void changeTaskStatus(taskId, newStatusId).catch((error) => {
      console.error(error)
      setLocalTasks(previousTasks)
    })
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <BoardColumn
          statusId={null}
          title="Unassigned"
          tasks={localTasks}
          lists={lists}
          currentListId={currentListId}
        />
        {sortedStatuses.map((status) => (
          <BoardColumn
            statusId={status.id}
            key={status.id}
            title={status.title}
            tasks={localTasks}
            lists={lists}
            currentListId={currentListId}
          />
        ))}
      </div>
    </DragDropProvider>
  )
}
