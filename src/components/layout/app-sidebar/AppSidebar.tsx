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
import { PlanomyIcon } from '@/icons/PlanomyIcon'

export async function AppSidebar() {
  const lists = await getUserLists()

  return (
    <Sidebar variant="floating" collapsible="icon" className="">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Planomy"
              className="justify-start group-data-[collapsible=icon]:justify-center"
            >
              <PlanomyIcon size={20} className="shrink-0" />
              <h2 className="font-heading text-2xl font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
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
