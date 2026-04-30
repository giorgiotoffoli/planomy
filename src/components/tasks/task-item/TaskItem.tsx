'use client'
import { List, TaskWithList } from '../../../types'
import { TaskEditDropdown } from './task-edit/TaskEditDropdown'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskTitle } from './TaskTitle'
import TaskDetail from './TaskDetails'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'

interface TaskItemProps {
  task: TaskWithList
  lists: List[]
  currentListId?: string
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDelete: (taskId: string) => void
  shouldHideCompleted: boolean
}

export function TaskItem({
  task,
  lists,
  currentListId,
  handleOnComplete,
  handleOnRename,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
  shouldHideCompleted,
}: TaskItemProps) {
  const isCompletedPage = useParams()
  return (
    <li
      className={cn(
        'flex justify-between items-center group transition-all duration-200 rounded-md p-2 hover:bg-gray-300',
        task.completed &&
          shouldHideCompleted &&
          'opacity-0 scale-95 line-through',
      )}
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center ">
          <TaskCheckbox task={task} handleOnComplete={handleOnComplete} />
          <TaskTitle task={task} handleOnRename={handleOnRename} />
        </div>
        <TaskDetail task={task} currentListId={currentListId} />
      </div>
      <div>
        <TaskEditDropdown
          task={task}
          lists={lists}
          currentListId={currentListId}
          handleOnDueDateChange={handleOnDueDateChange}
          handleOnNotesChange={handleOnNotesChange}
          handleOnDelete={handleOnDelete}
        >
          <Button variant="ghost" className="cursor-pointer">
            ⋯
          </Button>
        </TaskEditDropdown>
      </div>
    </li>
  )
}
