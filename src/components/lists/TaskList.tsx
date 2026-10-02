import { TaskItem } from '../tasks/task-item/TaskItem'
import { List, TaskWithList } from '../../types'
import { useSearchParams } from 'next/navigation'
import { useId } from 'react'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface TaskListProps {
  localTasks: TaskWithList[]
  localLists: List[]
  currentListId: string | null
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnDelete: (taskId: string) => void
  pathName: string
  handleOnReorder: (activeId: string, overId: string) => void
  canReorder: boolean
}

export default function TaskList({
  localTasks,
  localLists,
  currentListId,
  handleOnComplete,
  handleOnRename,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
  pathName,
  handleOnReorder,
  canReorder,
}: TaskListProps) {
  const scope = useId()

  const shouldHideCompleted = pathName !== '/completed'
  const isInbox = pathName === '/inbox'
  const searchParams = useSearchParams()
  const taskId = searchParams.get('task') as string

  const tasklist = (
    <ul>
      {localTasks.map((task) => (
        <TaskItem
          highlighted={taskId === task.id}
          key={task.id}
          task={task}
          lists={localLists}
          currentListId={currentListId}
          handleOnComplete={handleOnComplete}
          handleOnRename={handleOnRename}
          handleOnDueDateChange={handleOnDueDateChange}
          handleOnNotesChange={handleOnNotesChange}
          handleOnDelete={handleOnDelete}
          shouldHideCompleted={shouldHideCompleted}
          isInbox={isInbox}
          canReorder={canReorder}
          dragScope={canReorder ? scope : undefined}
          handleOnReorder={handleOnReorder}
        />
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col h-full sm:w-full">
      <div className="flex-1 overflow-y-auto scroll-smooth pb-16">
        <SortableContext items={localTasks.map(task => task.id)} strategy={verticalListSortingStrategy} disabled={!canReorder}>
          {tasklist}
        </SortableContext>
      </div>
    </div>
  )
}
