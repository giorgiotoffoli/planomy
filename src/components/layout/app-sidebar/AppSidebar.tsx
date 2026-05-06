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
import { Layers2, Plus, PyramidIcon } from 'lucide-react'
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
            <div className="flex h-8 items-center gap-2 rounded-md px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-1">
              <PyramidIcon className="size-5" />
              <h2 className="font-heading text-2xl font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                planomy
              </h2>
            </div>
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
