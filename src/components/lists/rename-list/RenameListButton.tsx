'use client'
import { Pencil, Trash } from 'lucide-react'
import { DropdownMenuItem } from '../../ui/dropdown-menu'
import { List } from '@/components/tasks/types'
import { RenameListDialog } from './RenameListDialog'

export function RenameListButton({ list }: { list: List }) {
  return (
    <RenameListDialog list={list}>
      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
        <Pencil />
        Rename
      </DropdownMenuItem>
    </RenameListDialog>
  )
}
