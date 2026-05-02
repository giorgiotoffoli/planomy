'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Calendar, CheckCircle, Clock, Inbox, Layers } from 'lucide-react'

type Tab = {
  title: string
  link: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  {
    title: 'Inbox',
    link: '/inbox',
    icon: <Inbox />,
  },
  {
    title: 'Today',
    link: '/today',
    icon: <Calendar />,
  },
  {
    title: 'Scheduled',
    link: '/scheduled',
    icon: <Clock />,
  },
  {
    title: 'All',
    link: '/all',
    icon: <Layers />,
  },
  {
    title: 'Completed',
    link: '/completed',
    icon: <CheckCircle />,
  },
]

export default function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {tabs.map((tab) => (
        <SidebarMenuItem key={tab.title}>
          <SidebarMenuButton
            asChild
            isActive={pathname === tab.link}
            tooltip={tab.title}
          >
            <Link href={tab.link} prefetch>
              {tab.icon}
              <span>{tab.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
