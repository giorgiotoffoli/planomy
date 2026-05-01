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
import { renameList } from '../actions'
import { List } from '@/types'
import { Input } from '@/components/ui/input'
import { DialogDescription } from '@radix-ui/react-dialog'

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
      <form action={handleSubmit}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename {list.title}</DialogTitle>
            <DialogDescription>
              This will rename this list in the sidebar.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>New Title</FieldLabel>
              <Input
                name="new_title"
                id="new_title"
                defaultValue={list.title}
              />
            </Field>
            <Field>
              <Input hidden defaultValue={list.id} name="list_id" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="bg-blue-500 hover:bg-sky-500">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
