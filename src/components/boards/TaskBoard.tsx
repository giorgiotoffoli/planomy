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
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium text-muted-foreground">Board</h2>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full w-max gap-4 p-4">
            <div className="h-full w-80 shrink-0">
              <BoardColumn
                statusId={null}
                title="Unassigned"
                tasks={localTasks}
                lists={lists}
                currentListId={currentListId}
              />
            </div>

            {sortedStatuses.map((status) => (
              <div key={status.id} className="h-full w-80 shrink-0">
                <BoardColumn
                  statusId={status.id}
                  title={status.title}
                  tasks={localTasks}
                  lists={lists}
                  currentListId={currentListId}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </DragDropProvider>
  )
}
