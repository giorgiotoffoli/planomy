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
import { List, Task } from '@/types'
import { ReactNode, useState } from 'react'
import { TaskEditDialog } from './TaskEditDialog'
import { Edit, ListEnd } from 'lucide-react'
import { TaskEditMoveList } from './TaskEditMoveList'
import { TaskDeleteButton } from './TaskDeleteButton'
import { DialogTrigger } from '@radix-ui/react-dialog'

export function TaskEditDropdown({
  task,
  lists,
  currentListId,
  children,
}: {
  task: Task
  lists: List[]
  currentListId?: string
  children: ReactNode
}) {
  return (
    <>
      <TaskEditDialog task={task}>
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

            <TaskDeleteButton taskId={task.id} />
          </DropdownMenuContent>
        </DropdownMenu>
      </TaskEditDialog>
    </>
  )
}
