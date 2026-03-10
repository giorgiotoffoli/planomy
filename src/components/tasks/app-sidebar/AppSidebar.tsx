import { signOut } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Ghost, Inbox, Plus, Pyramid, User } from 'lucide-react'
import CreateTaskDialog from '../create-task/CreateTaskDialog'

export function AppSidebar() {
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Pyramid />
              <a href="/">
                <span className="text-lg font-semibold font-stretch-125%">
                  Planomy
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tasks</SidebarGroupLabel>
          <SidebarGroupAction>
            <CreateTaskDialog>
              <Plus />
            </CreateTaskDialog>
            <span className="sr-only">Add Task</span>
          </SidebarGroupAction>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="#">
                <Inbox />
                <span>Inbox</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <form action={signOut} className="">
          <Button variant="outline" className="font-bold">
            <User />
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
