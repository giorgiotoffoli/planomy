'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  AlarmClock,
  Archive,
  CalendarDays,
  Home,
  SearchIcon,
} from 'lucide-react'
import { CommandDialog } from '@/components/ui/command'
import { useState } from 'react'
import SearchModal from '../search-modal'

type Tab = {
  title: string
  link: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  {
    title: 'Home',
    link: '/home',
    icon: <Home />,
  },
  {
    title: 'Calendar',
    link: '/calendar',
    icon: <CalendarDays />,
  },
  {
    title: 'Deadlines',
    link: '/deadlines',
    icon: <AlarmClock />,
  },
  {
    title: 'Archive',
    link: '/completed',
    icon: <Archive />,
  },
]

export default function NavMain() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {tabs.map((tab) => (
        <SidebarMenuItem key={tab.title}>
          <SidebarMenuButton
            asChild
            isActive={pathname === tab.link}
            tooltip={tab.title}
            className="[&>svg]:!size-5"
          >
            <Link href={tab.link} prefetch>
              {tab.icon}
              <span>{tab.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      {/* Search */}
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Search"
          onClick={() => setOpen(true)}
          className="cursor-pointer [&>svg]:!size-5"
        >
          <SearchIcon />
          <span>Search</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <SearchModal setOpen={setOpen} />
      </CommandDialog>
    </SidebarMenu>
  )
}
