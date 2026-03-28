import { SidebarMenuButton } from '@/components/ui/sidebar'
import { MoreHorizontal, Plus } from 'lucide-react'
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
import { Button } from '@/components/ui/button'

export function NavLists({ lists }: { lists: List[] }) {
  return (
    <>
      <CreateListDialog>
        <SidebarMenuButton className="text-sm transition-colors hover:bg-muted hover:text-foreground">
          <Plus />
          <span>New List</span>
        </SidebarMenuButton>
      </CreateListDialog>

      {lists.map((list) => {
        return (
          <DropdownMenu key={list.id}>
            <div className="flex items-center hover:bg-muted transition duration-200 rounded-md group/list">
              <SidebarMenuButton
                asChild
                className="group-hover/list:text-black hover:bg-transparent"
              >
                <Link href={`/lists/${encodeURIComponent(list.id)}`}>
                  <span className="text-base truncate">{list.title}</span>
                </Link>
              </SidebarMenuButton>

              <DropdownMenuTrigger asChild>
                <Button
                  variant={null}
                  className="hover:cursor-pointer group-hover/list:text-black "
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                <RenameListButton list={list} />
                <DeleteListButton list={list} />
              </DropdownMenuContent>
            </div>
          </DropdownMenu>
        )
      })}
    </>
  )
}
