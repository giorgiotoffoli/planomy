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
import CreateTaskForm from './CreateListForm'
import { createList } from '../actions'
import { DialogTitle } from '@radix-ui/react-dialog'

export default function CreateTaskDialog({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    await createList(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogTitle hidden>Add List</DialogTitle>
      <DialogContent className="sm:max-w-sm">
        <FieldGroup>
          <form action={handleSubmit}>
            <CreateTaskForm />
            <br />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add List</Button>
            </DialogFooter>
          </form>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}
