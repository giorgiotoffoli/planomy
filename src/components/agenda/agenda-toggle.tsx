'use client'

import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgenda } from './agenda-provider'

export default function AgendaToggle() {
  const { open, setOpen } = useAgenda()
  return <Button type="button" data-agenda-toggle variant={open ? 'secondary' : 'ghost'} size="icon" aria-label={open ? 'Close Today calendar' : 'Open Today calendar'} aria-expanded={open} aria-controls="daily-agenda" onClick={() => setOpen(!open)}><CalendarClock /></Button>
}
