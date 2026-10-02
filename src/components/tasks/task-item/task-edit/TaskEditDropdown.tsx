'use client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { List, TaskWithList } from '@/types'
import { ReactNode } from 'react'
import { TaskEditDialog } from './TaskEditDialog'
import { Edit, ListEnd } from 'lucide-react'
import { TaskEditMoveList } from './TaskEditMoveList'
import { TaskDeleteButton } from './TaskDeleteButton'
import { DialogTrigger } from '@radix-ui/react-dialog'
import MyDayMenuItem from '@/components/my-day/MyDayMenuItem'

interface TaskEditDropdownProps {
  task: TaskWithList
  lists: List[]
  currentListId: string | null
  children: ReactNode
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDelete: (taskId: string) => void
  handleOnRename: (taskId: string, newName: string) => void
}

export function TaskEditDropdown({
  task,
  lists,
  currentListId,
  children,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnDelete,
  handleOnRename,
}: TaskEditDropdownProps) {
  return (
    <>
      <TaskEditDialog
        task={task}
        lists={lists}
        currentListId={currentListId}
        handleOnDueDateChange={handleOnDueDateChange}
        handleOnNotesChange={handleOnNotesChange}
        handleOnRename={handleOnRename}
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

              <DropdownMenuSubContent>
                <TaskEditMoveList
                  taskId={task.id}
                  lists={lists}
                  currentListId={currentListId}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {!task.completed && <MyDayMenuItem taskId={task.id} />}

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
