'use client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Task } from '../../types'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { TaskDatePicker } from '../../TaskDatePicker'
import { updateTask } from '@/components/tasks/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ReactNode, useState } from 'react'

export function TaskEditDialog({
  task,
  children,
}: {
  task: Task
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    await updateTask(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onSelect={(e) => e.preventDefault()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-semibold">
            Editing: {task.title}
          </DialogTitle>
          <DialogDescription className="opacity-75 text-sm">
            {task.notes}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
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
