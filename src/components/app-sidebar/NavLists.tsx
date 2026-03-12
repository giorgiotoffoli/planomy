import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { Circle, MoreHorizontal, Trash } from 'lucide-react'
import { List } from '../tasks/types'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { DeleteListButton } from '../lists/delete-list/DeleteListButton'
import { RenameListDialog } from '../lists/rename-list/RenameListDialog'
import { RenameListButton } from '../lists/rename-list/RenameListButton'

export async function NavLists({ lists }: { lists: List[] }) {
  return (
    <SidebarMenuItem>
      {lists.map((list) => {
        return (
          <DropdownMenu key={list.id}>
            <SidebarMenuButton asChild key={list.id}>
              <Link href={`/lists/${encodeURIComponent(list.id)}`}>
                <Circle />
                <span>{list.title}</span>
                <DropdownMenuTrigger asChild>
                  <MoreHorizontal className="ml-auto" />
                </DropdownMenuTrigger>
              </Link>
            </SidebarMenuButton>
            <DropdownMenuContent>
              <RenameListButton list={list} />
              <DeleteListButton list={list} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </SidebarMenuItem>
  )
}
