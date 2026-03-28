import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Plus, Pyramid } from 'lucide-react'
import CreateTaskDialog from '../../tasks/create-task/CreateTaskDialog'
import NavMain from './NavMain'
import { ProfileButton } from './ProfileButton'
import ListGroup from './ListGroup'
import { getUserLists } from '@/components/lists/queries'

export async function AppSidebar() {
  const lists = await getUserLists()

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Pyramid />
              <span className="text-2xl font-semibold font-stretch-155%">
                Planomy
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Tasks */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Tasks</SidebarGroupLabel>
          <SidebarGroupAction>
            <CreateTaskDialog>
              <Plus />
            </CreateTaskDialog>
            <span className="sr-only">
              <CreateTaskDialog>Add Task</CreateTaskDialog>
            </span>
          </SidebarGroupAction>
          <NavMain />
        </SidebarGroup>
        {/* Lists */}
        <ListGroup lists={lists} />
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
