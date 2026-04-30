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
import { usePathname } from 'next/navigation'

interface CreateTaskDialogProps {
  children: ReactNode
  handleOnCreate: (
    title: string,
    dueDate: string,
    notes: string,
    listId: string,
  ) => void
}

export default function CreateTaskDialog({
  children,
  handleOnCreate,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const pathName = usePathname()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()

            const formData = new FormData(e.currentTarget)

            const title = formData.get('title') as string
            const dueDate = formData.get('due_date') as string
            const notes = formData.get('notes') as string
            const listId = formData.get('listId') as string

            handleOnCreate(title, dueDate, notes, listId)
            setOpen(false)
          }}
        >
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
