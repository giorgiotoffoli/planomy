import { Inbox, Calendar, SunIcon, Check, Archive } from 'lucide-react'

export const defaultLists = [
  {
    title: 'Inbox',
    icon: Inbox,
    url: '/inbox',
  },
  {
    title: 'All',
    icon: Archive,
    url: '/all',
  },
  {
    title: 'Scheduled',
    icon: Calendar,
    url: '/scheduled',
  },
  {
    title: 'Today',
    icon: SunIcon,
    url: '/today',
  },
  {
    title: 'Completed',
    icon: Check,
    url: '/completed',
  },
]
