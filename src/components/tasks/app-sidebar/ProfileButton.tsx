import { signOut } from '@/app/auth/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { User, SettingsIcon, LogOutIcon } from 'lucide-react'

export function ProfileButton() {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton>
            <User />
            Profile
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOut}>
            <DropdownMenuItem variant="destructive" asChild>
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOutIcon />
                Log out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
