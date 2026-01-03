import type { List } from '@/types/task'
import { Inbox, Calendar, SunIcon, Check } from 'lucide-react'

export const defaultLists: List[] = [
  {
    id: 'All',
    title: 'All',
    icon: Inbox,
  },
  {
    id: 'Scheduled',
    title: 'Scheduled',
    icon: Calendar,
  },
  {
    id: 'Today',
    title: 'Today',
    icon: SunIcon,
  },
  {
    id: 'Completed',
    title: 'Completed',
    icon: Check,
  },
]
