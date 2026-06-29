'use client'

import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
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
import { useEffect, useState } from 'react'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString } from '@/lib/crypto/e2ee'

export function NavLists({ lists }: { lists: List[] }) {
  const { masterKey } = useE2EE()
  const [localLists, setLocalLists] = useState(lists)

  useEffect(() => {
    if (!masterKey) return

    const unlockedMasterKey = masterKey
    let isCancelled = false

    async function decryptLists() {
      const decryptedLists = await Promise.all(
        lists.map(async (list) => ({
          ...list,
          title: await decryptString(list.title, unlockedMasterKey),
        })),
      )
      if (!isCancelled) {
        setLocalLists(decryptedLists)
      }
    }

    decryptLists().catch((error) => {
      console.error('Failed to decrypt lists', error)
    })

    return () => {
      isCancelled = true
    }
  }, [lists, masterKey])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <CreateListDialog>
          <SidebarMenuButton
            asChild
            tooltip="New list"
            className="hover:bg-muted cursor-pointer hover:text-sidebar-accent-foreground font-medium"
          >
            <button type="button">
              <CirclePlus />
              <span>New list</span>
            </button>
          </SidebarMenuButton>
        </CreateListDialog>
      </SidebarMenuItem>

      {localLists.map((list) => {
        return (
          <SidebarMenuItem key={list.id}>
            <SidebarMenuButton asChild tooltip={list.title}>
              <Link
                href={`/lists/${list.id}?view=${list.default_view ?? 'list'}`}
                prefetch
              >
                <Circle />
                <span>{list.title}</span>
              </Link>
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction>
                  <MoreHorizontal />
                  <span className="sr-only">Edit {list.title}</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" side="right">
                <RenameListButton list={list} />
                <DeleteListButton list={list} />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
