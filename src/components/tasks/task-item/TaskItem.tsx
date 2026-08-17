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
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { InboxIcon } from 'lucide-react'

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
    transition: transition
      ? `${transition}, opacity 300ms ease, background-color 200ms ease`
      : 'opacity 300ms ease, background-color 200ms ease',
  }

  const taskList = task.list_id
    ? lists.find((list) => list.id === task.list_id)
    : null

  const shouldShowTaskList =
    !isInbox && (task.list_id === null || currentListId !== task.list_id)

  const taskListLabel = task.list_id ? (
    taskList?.title
  ) : (
    <div className="flex gap-1 items-center">
      <InboxIcon size={13} />
      Inbox
    </div>
  )

  const taskListHref = task.list_id
    ? `/lists/${task.list_id}?view=${taskList?.default_view ?? 'list'}`
    : '/inbox'

  return (
    <li
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      style={style}
      className={cn(
        'group  hover:bg-gray-300',
        isDragging && 'cursor-grabbing opacity-50',
        highlighted && 'animate-pulse border-2 border-blue-400',
        task.completed && shouldHideCompleted && 'opacity-0 line-through',
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-3 py-3">
        {/* Checkbox */}
        <div className="flex h-6 items-center">
          <TaskCheckbox task={task} handleOnComplete={handleOnComplete} />
        </div>
        {/* Content */}
        <div className="min-w-0">
          <div className="flex min-h-6 items-center">
            <TaskTitle task={task} handleOnRename={handleOnRename} />
          </div>

          <TaskDetail
            task={task}
            currentListId={currentListId}
            lists={lists}
            isInbox={isInbox}
          />
        </div>
        {/* Right side content */}
        <div className="flex items-center gap-3">
          {shouldShowTaskList && taskListLabel && (
            <Link
              href={taskListHref}
              className="rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-500 hover:bg-blue-200 hover:text-blue-700"
            >
              {taskListLabel}
            </Link>
          )}

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

      <Separator className="mx-3 w-auto" />
    </li>
  )
}
