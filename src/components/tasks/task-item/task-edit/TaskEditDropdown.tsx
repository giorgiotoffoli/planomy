'use client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { List, Task, TaskWithList } from '@/types'
import { ReactNode, useState } from 'react'
import { TaskEditDialog } from './TaskEditDialog'
import { Edit, ListEnd } from 'lucide-react'
import { TaskEditMoveList } from './TaskEditMoveList'
import { TaskDeleteButton } from './TaskDeleteButton'
import { DialogTrigger } from '@radix-ui/react-dialog'

interface TaskEditDropdownProps {
  task: TaskWithList
  lists: List[]
  currentListId: string | null
  children: ReactNode
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDelete: (taskId: string) => void
}

export function TaskEditDropdown({
  task,
  lists,
  currentListId,
  children,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
}: TaskEditDropdownProps) {
  return (
    <>
      <TaskEditDialog
        task={task}
        handleOnDueDateChange={handleOnDueDateChange}
        handleOnNotesChange={handleOnNotesChange}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DialogTrigger asChild>
              <DropdownMenuItem>
                <Edit />
                Edit
              </DropdownMenuItem>
            </DialogTrigger>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListEnd />
                Move
              </DropdownMenuSubTrigger>

              <TaskEditMoveList
                taskId={task.id}
                lists={lists}
                currentListId={currentListId}
              />
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <TaskDeleteButton
              taskId={task.id}
              handleOnDelete={handleOnDelete}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </TaskEditDialog>
    </>
  )
}
