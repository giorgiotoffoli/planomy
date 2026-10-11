'use client'
import { signOut } from '@/app/auth/actions'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { User, SettingsIcon, LogOutIcon } from 'lucide-react'
import { useE2EE } from '@/components/e2ee/e2ee-provider'

export function ProfileButton() {
  const { lock } = useE2EE()

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="Profile" className="[&>svg]:!size-5">
            <User />
            <span>Profile</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <SettingsIcon />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" asChild>
            <div>
              <LogOutIcon />
              <form action={signOut} onSubmit={lock}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2"
                >
                  Log out
                </button>
              </form>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
