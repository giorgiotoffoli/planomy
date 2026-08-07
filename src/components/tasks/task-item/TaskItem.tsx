'use client'
import { List, TaskWithList } from '../../../types'
import { TaskEditDropdown } from './task-edit/TaskEditDropdown'
import { Button } from '@/components/ui/button'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskTitle } from './TaskTitle'
import TaskDetail from './TaskDetails'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface TaskItemProps {
  task: TaskWithList
  lists: List[]
  currentListId: string | null
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDelete: (taskId: string) => void
  shouldHideCompleted: boolean
  isInbox: boolean
  highlighted: boolean
  canReorder: boolean
}

export function TaskItem({
  task,
  lists,
  highlighted,
  currentListId,
  handleOnComplete,
  handleOnRename,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
  shouldHideCompleted,
  isInbox,
  canReorder,
}: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex justify-between items-center group transition-colors duration-200 rounded-md p-2 hover:bg-gray-300',
        isDragging && 'opacity-50',
        highlighted && 'border-2 border-blue-400 animate-pulse',
        task.completed &&
          shouldHideCompleted &&
          'opacity-0 scale-95 line-through',
      )}
    >
      {canReorder && (
        <button
          {...attributes}
          {...listeners}
          className="
    mr-1 cursor-grab opacity-50
    hover:opacity-100
    active:cursor-grabbing
  "
          aria-label="Reorder task"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="flex flex-col w-full">
        <div className="flex items-center ">
          <TaskCheckbox task={task} handleOnComplete={handleOnComplete} />
          <TaskTitle task={task} handleOnRename={handleOnRename} />
        </div>
        <TaskDetail
          task={task}
          currentListId={currentListId}
          lists={lists}
          isInbox={isInbox}
        />
      </div>
      <div>
        <TaskEditDropdown
          task={task}
          lists={lists}
          currentListId={currentListId}
          handleOnDueDateChange={handleOnDueDateChange}
          handleOnNotesChange={handleOnNotesChange}
          handleOnDelete={handleOnDelete}
          handleOnRename={handleOnRename}
        >
          <Button variant="ghost" className="cursor-pointer">
            ⋯
          </Button>
        </TaskEditDropdown>
      </div>
    </li>
  )
}
