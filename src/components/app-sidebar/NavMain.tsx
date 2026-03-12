import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { Calendar, GalleryHorizontalEnd, Inbox, Sun } from 'lucide-react'

const navMainTabs = [
  {
    title: 'Inbox',
    link: '/inbox',
    icon: <Inbox />,
  },
  {
    title: 'Today',
    link: '/today',
    icon: <Sun />,
  },
  {
    title: 'Scheduled',
    link: '/scheduled',
    icon: <Calendar />,
  },
  {
    title: 'All',
    link: '/all',
    icon: <GalleryHorizontalEnd />,
  },
]

export default function NavMain() {
  return (
    <SidebarMenuItem>
      {navMainTabs.map((tab) => {
        return (
          <SidebarMenuButton asChild key={tab.title}>
            <a href={tab.link}>
              {tab.icon}
              <span>{tab.title}</span>
            </a>
          </SidebarMenuButton>
        )
      })}
    </SidebarMenuItem>
  )
}
