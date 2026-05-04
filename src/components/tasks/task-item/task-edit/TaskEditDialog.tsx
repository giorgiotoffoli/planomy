'use client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Task } from '../../../../types'
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

interface TaskEditDialogProps {
  task: Task
  children: ReactNode
  handleOnDueDateChange: (taskId: string, newDueDate: string) => void
  handleOnNotesChange: (taskId: string, notes: string) => void
}

export function TaskEditDialog({
  task,
  children,
  handleOnDueDateChange,
  handleOnNotesChange,
}: TaskEditDialogProps) {
  return (
    <Dialog>
      {children}
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            console.log('clicked')
            const formData = new FormData(e.currentTarget)

            const taskId = formData.get('id') as string
            const newDueDate = formData.get('due_date') as string
            const notes = formData.get('notes') as string

            if (newDueDate) {
              handleOnDueDateChange(taskId, newDueDate)
            }
            if (notes) {
              handleOnNotesChange(taskId, notes)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="mb-3">Editing {task.title}</DialogTitle>
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
