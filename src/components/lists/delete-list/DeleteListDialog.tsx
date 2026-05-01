'use client'

import { buttonVariants } from '@/components/ui/button'
import { ReactNode, useState } from 'react'
import { deleteList } from '../actions'
import { List } from '@/types'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

export function DeleteListDialog({
  children,
  list,
}: {
  children: ReactNode
  list: List
}) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete List?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete list{' '}
            <span className="font-semibold">{list.title}</span> and all tasks
            inside of it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteList(list.id)}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
