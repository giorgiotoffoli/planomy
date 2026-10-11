'use client'

import { useEffect, useState } from 'react'
import { CalendarPlus, CalendarX } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { localDateKey } from '@/lib/today'
import { isTaskSelectedToday, removeTaskFromDay, selectTaskForDay } from './actions'
import { toast } from 'sonner'

export default function TodayMenuItem({ taskId }: { taskId: string }) {
  const [selected, setSelected] = useState<boolean | null>(null)
  useEffect(() => {
    isTaskSelectedToday(taskId, localDateKey()).then(setSelected).catch(() => setSelected(null))
  }, [taskId])

  return (
    <DropdownMenuItem
      disabled={selected === null}
      onSelect={async () => {
        const previous = selected
        const next = !selected
        setSelected(next)
        try {
          if (next) await selectTaskForDay(taskId, localDateKey())
          else await removeTaskFromDay(taskId, localDateKey())
          toast.success(next ? 'Added to Today' : 'Removed from Today')
        } catch (error) {
          setSelected(previous)
          toast.error(error instanceof Error ? error.message : 'Could not update Today')
        }
      }}
    >
      {selected ? <CalendarX /> : <CalendarPlus />}
      {selected ? 'Remove from Today' : 'Add to Today'}
    </DropdownMenuItem>
  )
}
