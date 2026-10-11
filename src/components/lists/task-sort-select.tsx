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
}

export default function TaskSortSelect({
  value,
  onValueChange,
}: TaskSortSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" aria-label="Sort tasks">
        {value.startsWith('alphabetical') ? <ArrowDownAZ /> : <ArrowDownUp />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="manual">Manual order</SelectItem>
        <SelectItem value="due-date-asc">Due date: earliest</SelectItem>
        <SelectItem value="due-date-desc">Due date: latest</SelectItem>
        <SelectItem value="alphabetical-asc">Title: A–Z</SelectItem>
        <SelectItem value="alphabetical-desc">Title: Z–A</SelectItem>
      </SelectContent>
    </Select>
  )
}
