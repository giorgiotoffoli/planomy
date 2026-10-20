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
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { ReactNode, useState } from 'react'
import { renameList } from '../actions'
import { List } from '@/types'
import { Input } from '@/components/ui/input'
import { DialogDescription } from '@radix-ui/react-dialog'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { encryptString } from '@/lib/crypto/e2ee'
import { toast } from 'sonner'
import { ListEmojiPicker } from '../list-emoji-picker'
import { notifyListsChanged } from '../mutations'

export function RenameListDialog({
  children,
  list,
}: {
  children: ReactNode
  list: List
}) {
  const [open, setOpen] = useState(false)
  const [emoji, setEmoji] = useState<string | null>(list.emoji)
  const [saving, setSaving] = useState(false)
  const { masterKey } = useE2EE()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename {list.title}</DialogTitle>
          <DialogDescription>
            This will rename this list in the sidebar.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault()

            const formData = new FormData(e.target)
            const newListTitle = formData.get('new_title') as string

            if (!masterKey) {
              toast.error('Encryption key is locked.')
              return
            }

            if (!newListTitle.trim()) {
              toast.error('Enter a list name.')
              return
            }

            const [encryptedTitle, encryptedEmoji] = await Promise.all([
              encryptString(newListTitle.trim(), masterKey),
              emoji ? encryptString(emoji, masterKey) : Promise.resolve(null),
            ])

            setSaving(true)
            notifyListsChanged({
              listId: list.id,
              title: newListTitle.trim(),
              emoji,
              phase: 'optimistic',
            })
            try {
              await renameList(list.id, encryptedTitle, encryptedEmoji)
              notifyListsChanged()
              setOpen(false)
            } catch (cause) {
              notifyListsChanged({
                listId: list.id,
                title: list.title,
                emoji: list.emoji,
                phase: 'rollback',
              })
              toast.error(
                cause instanceof Error ? cause.message : 'List could not be renamed.',
              )
            } finally {
              setSaving(false)
            }
          }}
        >
          <FieldGroup>
            <Field orientation="horizontal" className="items-center">
              <FieldLabel htmlFor="list-emoji">Icon</FieldLabel>
              <ListEmojiPicker value={emoji} onChange={setEmoji} />
            </Field>
            <Field>
              <FieldLabel>New Title</FieldLabel>
              <Input
                name="new_title"
                id="new_title"
                defaultValue={list.title}
                disabled={saving}
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
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? 'Saving…' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
