import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar'
import NavMain from './nav-main'
import { ProfileButton } from './profile-button'
import ListGroup from './list-group'
import { getUserLists } from '@/components/lists/queries'
import { SidebarBrand } from './sidebar-brand'

export async function AppSidebar() {
  const lists = await getUserLists()

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
    >
      <SidebarHeader
        className="h-12 min-h-12 max-h-12 shrink-0 justify-center border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:px-2"
      >
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        <SidebarGroup className="p-0">
          <NavMain />
        </SidebarGroup>
        <ListGroup lists={lists} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <SidebarMenu>
          <ProfileButton />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
