'use client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { List, TaskWithList } from '../../../../types'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { TaskDatePicker } from '../../TaskDatePicker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReactNode } from 'react'
import { TaskTitle } from '../TaskTitle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskEditMoveList } from './TaskEditMoveList'
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import TaskListDropdown from './TaskListDropdown'
import { moveTask } from '../../actions'

interface TaskEditDialogProps {
  task: TaskWithList
  lists: List[]
  currentListId: string | null
  children: ReactNode
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
  handleOnRename: (taskId: string, newName: string) => void
}

export function TaskEditDialog({
  task,
  lists,
  currentListId,
  children,
  handleOnDueDateChange,
  handleOnNotesChange,
  handleOnRename,
}: TaskEditDialogProps) {
  return (
    <Dialog>
      {children}
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            console.log('clicked')
            const formData = new FormData(e.currentTarget)

            const taskId = formData.get('id') as string
            const newDueDate = formData.get('due_date') as string
            const notes = formData.get('notes') as string
            const selectedList = formData.get('list_id') as string
            const newListId = selectedList === 'inbox' ? null : selectedList

            if (newDueDate) {
              handleOnDueDateChange(taskId, newDueDate)
            }
            if (notes) {
              handleOnNotesChange(taskId, notes)
            }

            if (newListId !== currentListId) {
              await moveTask(taskId, newListId)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1">
              <span className="shrink-0">Editing</span>
              <TaskTitle task={task} handleOnRename={handleOnRename} />
            </DialogTitle>
            <DialogDescription className="opacity-75 text-sm">
              {task.notes}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <input type="hidden" name="id" value={task.id} />
            <Field orientation="horizontal">
              <TaskDatePicker taskDate={task.due_date} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="notes" className="w-1/2">
                Notes
              </FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Task notes..."
                defaultValue={task.notes}
              />
            </Field>
          </FieldGroup>
          <FieldGroup>
            <Field>
              <FieldLabel>List</FieldLabel>
              <Select name="list_id" defaultValue={currentListId ?? 'inbox'}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Choose List" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <TaskListDropdown lists={lists} />
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="default"
              type="submit"
              className="bg-blue-500 hover:bg-sky-500 mt-3"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
