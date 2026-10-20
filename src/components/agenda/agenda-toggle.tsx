'use client'

import { Calendar1 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgenda } from './agenda-provider'

export default function AgendaToggle() {
  const { open, setOpen } = useAgenda()
  return <Button type="button" data-agenda-toggle variant={open ? 'secondary' : 'ghost'} size="icon" title={open ? 'Close Planner' : 'Open Planner'} aria-label={open ? 'Close Planner' : 'Open Planner'} aria-expanded={open} aria-controls="daily-agenda" onClick={() => setOpen(!open)}><Calendar1 /></Button>
}
