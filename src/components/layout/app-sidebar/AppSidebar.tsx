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
import { Layers2, Plus } from 'lucide-react'
import NavMain from './NavMain'
import { ProfileButton } from './ProfileButton'
import ListGroup from './ListGroup'
import { getUserLists } from '@/components/lists/queries'

export async function AppSidebar() {
  const lists = await getUserLists()

  return (
    <Sidebar variant="floating" collapsible="icon" className="font-medium">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="[&>svg]:size-5 ">
              <Layers2 className="rotate-240" />
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                planomy
              </h2>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Tasks */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs tracking-wide">
            Tasks
          </SidebarGroupLabel>
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
