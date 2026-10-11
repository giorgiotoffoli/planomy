'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  CheckCircle,
  Clock,
  Inbox,
  Layers,
  SearchIcon,
  Sun,
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
    title: 'Today',
    link: '/today',
    icon: <Sun />,
  },
  {
    title: 'Inbox',
    link: '/inbox',
    icon: <Inbox />,
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
          className="cursor-pointer"
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
