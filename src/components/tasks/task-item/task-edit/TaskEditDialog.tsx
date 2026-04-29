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
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Editing: {task.title}
          </DialogTitle>
          <DialogDescription className="opacity-75 text-sm">
            {task.notes}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()

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
          <input type="hidden" name="id" value={task.id} />
          <FieldGroup className="gap-4">
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
            <Button variant="default" type="submit">
              Save Changes
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
