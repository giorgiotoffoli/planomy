import { SidebarMenuButton } from '@/components/ui/sidebar'
import { MoreHorizontal, Plus, Trash } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { DeleteListButton } from '../../lists/delete-list/DeleteListButton'
import { RenameListButton } from '../../lists/rename-list/RenameListButton'
import CreateListDialog from '@/components/lists/create-list/CreateListDialog'
import { List } from '@/components/tasks/types'

export function NavLists({ lists }: { lists: List[] }) {
  return (
    <>
      {/* Create List Button */}
      <CreateListDialog>
        <SidebarMenuButton className="text-sm  hover:text-foreground hover:bg-muted transition-colors">
          <Plus />
          <span>New List</span>
        </SidebarMenuButton>
      </CreateListDialog>

      {lists.map((list) => {
        return (
          <DropdownMenu key={list.id}>
            <SidebarMenuButton asChild key={list.id}>
              <span>
                <Link href={`/lists/${encodeURIComponent(list.id)}`}>
                  <span className="text-base truncate">{list.title}</span>
                </Link>
                <DropdownMenuTrigger asChild>
                  <MoreHorizontal className="ml-auto" />
                </DropdownMenuTrigger>
              </span>
            </SidebarMenuButton>
            <DropdownMenuContent>
              <RenameListButton list={list} />
              <DeleteListButton list={list} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </>
  )
}
