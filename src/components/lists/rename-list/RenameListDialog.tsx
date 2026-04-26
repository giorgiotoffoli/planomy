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
  FieldLabel,
  FieldLegend,
} from '@/components/ui/field'
import { ReactNode, useState } from 'react'
import { deleteList, renameList } from '../actions'
import { List } from '@/types'
import { Input } from '@/components/ui/input'

export function RenameListDialog({
  children,
  list,
}: {
  children: ReactNode
  list: List
}) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    await renameList(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogTitle hidden>Delete List</DialogTitle>
      <DialogContent className="sm:max-w-sm">
        <form action={handleSubmit}>
          <FieldLegend>Rename {list.title}?</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel>New Title</FieldLabel>
              <Input name="new_title" defaultValue={list.title} />
            </Field>
            <Field></Field>
            <Field>
              <Input hidden defaultValue={list.id} name="list_id" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
