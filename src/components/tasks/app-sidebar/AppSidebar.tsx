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
import { Plus, Pyramid } from 'lucide-react'
import CreateTaskDialog from '../create-task/CreateTaskDialog'
import NavMain from './NavMain'

import { ProfileButton } from './ProfileButton'

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
          <NavMain />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <ProfileButton />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
