'use client'

import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgenda } from './AgendaProvider'

export default function AgendaToggle() {
  const { open, setOpen } = useAgenda()
  return <Button data-agenda-toggle variant={open ? 'secondary' : 'ghost'} size="icon" aria-label={open ? 'Close daily agenda' : 'Open daily agenda'} aria-expanded={open} aria-controls="daily-agenda" onClick={() => setOpen(!open)}><CalendarClock /></Button>
}
