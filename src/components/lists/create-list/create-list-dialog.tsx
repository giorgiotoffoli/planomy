'use client'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { encryptString } from '@/lib/crypto/e2ee'
import { toast } from 'sonner'
import { ReactNode, useState } from 'react'
import CreateListForm from './create-list-form'
import { createList } from '../actions'
import { DialogTitle } from '@radix-ui/react-dialog'
import { normalizeListEmoji } from '@/lib/list-emojis'

export default function CreateListDialog({
  children,
}: {
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { masterKey } = useE2EE()

  async function handleSubmit(formData: FormData) {
    if (!masterKey) {
      toast.error('Encryption is locked.')
      return
    }

    const title = String(formData.get('title') ?? '')
    const emoji = normalizeListEmoji(formData.get('emoji') as string | null)

    if (!title.trim()) {
      toast.error('Enter a list name.')
      return
    }

    const [encryptedTitle, encryptedEmoji] = await Promise.all([
      encryptString(title.trim(), masterKey),
      emoji ? encryptString(emoji, masterKey) : Promise.resolve(null),
    ])

    await createList(encryptedTitle, encryptedEmoji)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle hidden>Add List</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit}>
          <CreateListForm />
          <br />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Add List</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
