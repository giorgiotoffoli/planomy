import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Circle, CirclePlus, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { DeleteListButton } from '../../lists/delete-list/DeleteListButton'
import { RenameListButton } from '../../lists/rename-list/RenameListButton'
import CreateListDialog from '@/components/lists/create-list/CreateListDialog'
import { List } from '@/types'
import { Button } from '@/components/ui/button'

export function NavLists({ lists }: { lists: List[] }) {
  return (
    <>
      <CreateListDialog>
        <SidebarMenuButton
          asChild
          className="group-hover/list:text-black hover:bg-muted cursor-pointer hover:text-sidebar-accent-foreground font-medium"
        >
          <button>
            <CirclePlus />
            <span>New list</span>
          </button>
        </SidebarMenuButton>
      </CreateListDialog>

      {lists.map((list) => {
        return (
          <div
            className="flex items-center hover:bg-muted rounded-md group/list"
            key={list.id}
          >
            <SidebarMenuButton asChild className="group-hover/list:text-black ">
              <Link
                href={`/lists/${list.id}?view=${list.default_view ?? 'list'}`}
                prefetch
              >
                <Circle />
                <span className="truncate">{list.title}</span>
              </Link>
            </SidebarMenuButton>

            <DropdownMenu key={list.id}>
              <DropdownMenuTrigger asChild>
                <button className="hover:cursor-pointer group-hover/list:text-black pr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                <RenameListButton list={list} />
                <DeleteListButton list={list} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </>
  )
}
