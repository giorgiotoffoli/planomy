'use client'

import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { DeleteListButton } from '../../lists/delete-list/delete-list-button'
import { RenameListButton } from '../../lists/rename-list/rename-list-button'
import { List } from '@/types'
import { useEffect, useState } from 'react'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { decryptString } from '@/lib/crypto/e2ee'
import { ListEmoji } from '@/components/lists/list-emoji'

export function NavLists({ lists }: { lists: List[] }) {
  const { masterKey } = useE2EE()
  const pathname = usePathname()
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
          emoji: list.emoji
            ? await decryptString(list.emoji, unlockedMasterKey)
            : list.emoji,
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
      {localLists.map((list) => {
        return (
          <SidebarMenuItem key={list.id}>
            <SidebarMenuButton
              asChild
              tooltip={list.title}
              isActive={pathname === `/lists/${list.id}`}
            >
              <Link
                href={`/lists/${list.id}?view=${list.default_view ?? 'list'}`}
                prefetch
              >
                <ListEmoji emoji={list.emoji} className="text-lg" />
                <span>{list.title}</span>
              </Link>
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
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
