'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDownAZ, ArrowDownUp } from 'lucide-react'
import type { TaskSortOption } from './task-sorting'

interface TaskSortSelectProps {
  value: TaskSortOption
  onValueChange: (value: TaskSortOption) => void
  iconOnlyOnMobile?: boolean
}

const sortLabels: Record<TaskSortOption, string> = {
  manual: 'Manual order',
  'created-desc': 'Created: newest',
  'created-asc': 'Created: oldest',
  'due-date-asc': 'Due date: earliest',
  'due-date-desc': 'Due date: latest',
  'alphabetical-asc': 'Title: A–Z',
  'alphabetical-desc': 'Title: Z–A',
}

export default function TaskSortSelect({
  value,
  onValueChange,
  iconOnlyOnMobile = false,
}: TaskSortSelectProps) {
  const sortLabel = sortLabels[value]

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        aria-label={`Sort tasks: ${sortLabel}`}
        title={`Sort tasks: ${sortLabel}`}
        className={
          iconOnlyOnMobile
            ? 'size-8 shrink-0 justify-center p-0 [&>svg:last-child]:hidden sm:h-8 sm:w-fit sm:justify-between sm:px-3 sm:[&>svg:last-child]:inline'
            : undefined
        }
      >
        {value.startsWith('alphabetical') ? <ArrowDownAZ /> : <ArrowDownUp />}
        {iconOnlyOnMobile ? (
          <span className="hidden sm:inline">
            <SelectValue />
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="manual">Manual order</SelectItem>
        <SelectItem value="created-desc">Created: newest</SelectItem>
        <SelectItem value="created-asc">Created: oldest</SelectItem>
        <SelectItem value="due-date-asc">Due date: earliest</SelectItem>
        <SelectItem value="due-date-desc">Due date: latest</SelectItem>
        <SelectItem value="alphabetical-asc">Title: A–Z</SelectItem>
        <SelectItem value="alphabetical-desc">Title: Z–A</SelectItem>
      </SelectContent>
    </Select>
  )
}
