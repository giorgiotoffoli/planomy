'use client'
import { Trash } from 'lucide-react'
import { DropdownMenuItem } from '../../ui/dropdown-menu'
import { List } from '@/types'
import { DeleteListDialog } from './DeleteListDialog'

export function DeleteListButton({ list }: { list: List }) {
  return (
    <DeleteListDialog list={list}>
      <DropdownMenuItem
        variant="destructive"
        onSelect={(e) => e.preventDefault()}
      >
        <Trash />
        Delete
      </DropdownMenuItem>
    </DeleteListDialog>
  )
}
