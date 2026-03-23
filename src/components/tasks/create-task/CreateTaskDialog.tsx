'use client'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReactNode, useState } from 'react'
import CreateTaskForm from './CreateTaskForm'
import { createTask } from '@/components/tasks/actions'
import { usePathname } from 'next/navigation'

export default function CreateTaskDialog({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathName = usePathname()

  async function handleSubmit(formData: FormData) {
    await createTask(formData, pathName)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit}>
          {/* Task form */}
          <CreateTaskForm />
          <br />
          {/* Rest of dialog styling */}
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
