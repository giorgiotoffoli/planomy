'use client'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { ReactNode, useState } from 'react'
import CreateTaskForm from './CreateTaskForm'
import { createTask } from '@/components/tasks/actions'

export default function CreateTaskDialog({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    await createTask(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit}>
          <CreateTaskForm />
          <br />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="bg-blue-500 hover:bg-blue-700">
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
