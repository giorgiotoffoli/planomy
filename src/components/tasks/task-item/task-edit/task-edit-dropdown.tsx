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
import { Category, List, TaskWithList } from '@/types'
import { ReactNode } from 'react'
import { TaskEditDialog } from './task-edit-dialog'
import { Archive, ArchiveRestore, Check, Clock, Edit, ListEnd, Tag, Star } from 'lucide-react'
import { TaskEditMoveList } from './task-edit-move-list'
import { TaskDeleteButton } from './task-delete-button'
import { DialogTrigger } from '@radix-ui/react-dialog'
import { useAgenda } from '@/components/agenda/agenda-provider'
import { toast } from 'sonner'

interface TaskEditDropdownProps {
  task: TaskWithList
  lists: List[]
  currentListId: string | null
  children: ReactNode
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnDelete: (taskId: string) => void
  handleOnRename: (taskId: string, newName: string) => void
  handleOnFocus?: (taskId: string, focused: boolean) => void
  handleOnStash?: (taskId: string, stashed: boolean) => void
  categories?: Category[]
  handleOnChangeCategory?: (
    taskId: string,
    categoryId: string | null,
  ) => Promise<void>
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
  handleOnFocus,
  handleOnStash,
  categories,
  handleOnChangeCategory,
}: TaskEditDropdownProps) {
  const agenda = useAgenda()
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
                  taskListId={task.list_id}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {categories &&
              categories.length > 0 &&
              handleOnChangeCategory &&
              task.list_id && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tag />
                  Category
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() =>
                      void handleOnChangeCategory(task.id, null).catch((error) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Category was not changed.',
                        ),
                      )
                    }
                  >
                    {task.category_id === null && <Check />}
                    Uncategorized
                  </DropdownMenuItem>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onSelect={() =>
                        void handleOnChangeCategory(task.id, category.id).catch(
                          (error) =>
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : 'Category was not changed.',
                            ),
                        )
                      }
                    >
                      {task.category_id === category.id && <Check />}
                      {category.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            {!task.completed && handleOnFocus && (
              <DropdownMenuItem
                onSelect={() => handleOnFocus(task.id, !task.focused)}
              >
                <Star />
                {task.focused ? 'Remove from Focus' : 'Add to Focus'}
              </DropdownMenuItem>
            )}

            {!task.completed && handleOnStash && (
              <DropdownMenuItem
                onSelect={() => handleOnStash(task.id, !task.stashed)}
              >
                {task.stashed ? <ArchiveRestore /> : <Archive />}
                {task.stashed ? 'Return to Home' : 'Stash'}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem disabled={task.id.startsWith('temp-')} onSelect={() => setTimeout(() => agenda.edit(task), 0)}><Clock /> Schedule time</DropdownMenuItem>

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
