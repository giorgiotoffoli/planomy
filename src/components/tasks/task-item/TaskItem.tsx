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
import type { ReactNode } from 'react'
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
  dragScope?: string
  handleOnReorder?: (activeId: string, overId: string) => void
  leadingBadge?: ReactNode
  trailingActions?: ReactNode
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
  dragScope,
  handleOnReorder,
  leadingBadge,
  trailingActions,
}: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: { draggable: task.id.startsWith('temp-'), droppable: !canReorder },
    data: { kind: 'task', task, scope: dragScope, reorder: handleOnReorder },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, opacity 300ms ease, background-color 200ms ease`
      : 'opacity 300ms ease, background-color 200ms ease',
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group  hover:bg-gray-300 rounded-2xl',
        isDragging && 'cursor-grabbing opacity-50',
        highlighted && 'animate-pulse border-2 border-blue-400',
        task.completed && shouldHideCompleted && 'opacity-0 line-through',
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-3 py-3">
        {/* Checkbox */}
        <div className="flex h-6 items-center gap-2">
          <button ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Drag ${task.title} to reorder or schedule`} className="touch-none cursor-grab rounded text-muted-foreground focus-visible:ring-2"><GripVertical className="size-3.5" /></button>
          <TaskCheckbox task={task} handleOnComplete={handleOnComplete} />
        </div>
        {/* Content */}
        <div className="min-w-0">
          {leadingBadge}
          <TaskTitle task={task} handleOnRename={handleOnRename} />

          <TaskDetail
            task={task}
            currentListId={currentListId}
            lists={lists}
            isInbox={isInbox}
          />
        </div>
        {/* Right side content */}
        {/* For status
                        className="rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-500 hover:bg-blue-200 hover:text-blue-700"
          */}
        <div className="flex items-center gap-3">
          {trailingActions}
          <TaskEditDropdown
            task={task}
            lists={lists}
            currentListId={currentListId}
            handleOnDueDateChange={handleOnDueDateChange}
            handleOnNotesChange={handleOnNotesChange}
            handleOnDelete={handleOnDelete}
            handleOnRename={handleOnRename}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 cursor-pointer"
            >
              ⋯
            </Button>
          </TaskEditDropdown>
        </div>{' '}
      </div>
    </li>
  )
}
