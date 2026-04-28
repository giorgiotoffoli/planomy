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

  async function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return
    const taskId = event.operation.source?.id as string | undefined
    const targetId = event.operation.target?.id as string | undefined
    if (!taskId || !targetId) return
    const newStatusId = targetId === 'unassigned' ? null : targetId
    const previousTasks = localTasks

    // optimistic UI
    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? task.status_id !== newStatusId
            ? { ...task, status_id: newStatusId }
            : task
          : task,
      ),
    )

    try {
      console.log({ taskId, newStatusId })
      await changeTaskStatus(taskId, newStatusId)
    } catch (error) {
      // Rollback if database update fails
      setLocalTasks(previousTasks)
      console.log(error)
    }
  }

  return (
    <DragDropProvider onDragEnd={(event) => handleDragEnd(event)}>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <BoardColumn
          statusId={null}
          title="Unassigned"
          tasks={tasks}
          lists={lists}
          currentListId={currentListId}
        />
        {sortedStatuses.map((status) => (
          <BoardColumn
            statusId={status.id}
            key={status.id}
            title={status.title}
            tasks={tasks}
            lists={lists}
            currentListId={currentListId}
          />
        ))}
      </div>
    </DragDropProvider>
  )
}
