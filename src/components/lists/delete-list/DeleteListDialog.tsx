'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLegend,
} from '@/components/ui/field'
import { ReactNode, useState } from 'react'
import { deleteList } from '../actions'
import { List } from '@/components/tasks/types'
import { Input } from '@/components/ui/input'

export function DeleteListDialog({
  children,
  list,
}: {
  children: ReactNode
  list: List
}) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    await deleteList(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogTitle hidden>Delete List</DialogTitle>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit}>
          <FieldLegend>
            Are you sure you want to delete {list.title}?
          </FieldLegend>
          <FieldDescription>
            This will also delete all tasks in the List
          </FieldDescription>
          <FieldGroup>
            <Field>
              <Input hidden defaultValue={list.id} name="list_id" />
            </Field>
            <Field>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="destructive">
                Delete {list.title}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
