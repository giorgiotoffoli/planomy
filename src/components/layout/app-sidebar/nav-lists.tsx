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
import { ListColorMenu } from '@/components/lists/list-color-menu'
import { LISTS_CHANGED, listMutationFromEvent } from '@/components/lists/mutations'
import { applyListMutationToList } from '@/lib/live-mutations'

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

  useEffect(() => {
    const handleListsChanged = (event: Event) => {
      const change = listMutationFromEvent(event)
      if (!change) return
      setLocalLists((current) =>
        current.map((list) => applyListMutationToList(list, change)),
      )
    }

    window.addEventListener(LISTS_CHANGED, handleListsChanged)
    return () => window.removeEventListener(LISTS_CHANGED, handleListsChanged)
  }, [])

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
                <ListColorMenu
                  listId={list.id}
                  color={list.color}
                  onChange={(color) =>
                    setLocalLists((current) =>
                      current.map((item) =>
                        item.id === list.id ? { ...item, color } : item,
                      ),
                    )
                  }
                />
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
