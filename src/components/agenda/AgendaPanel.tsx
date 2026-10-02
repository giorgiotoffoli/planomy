'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { dayBounds, layoutBlocks, MINUTE, PIXELS_PER_MINUTE, shiftDay, timeLabel } from '@/lib/agenda'
import { localDateKey } from '@/lib/my-day'
import { useAgenda } from './AgendaProvider'
import AgendaTaskBlock from './AgendaTaskBlock'

const desktopQuery = '(min-width: 1280px)'
function subscribe(listener: () => void) {
  const query = window.matchMedia(desktopQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
function restoreFocus() { document.querySelector<HTMLButtonElement>('[data-agenda-toggle]')?.focus() }

export default function AgendaPanel() {
  const { open, setOpen } = useAgenda()
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(desktopQuery).matches, () => false)
  if (desktop) return open ? <aside id="daily-agenda" aria-label="Daily agenda" className="flex h-full w-[352px] shrink-0 flex-col border-l bg-background"><Timeline /></aside> : null
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent id="daily-agenda" showCloseButton={false} className="w-[min(100vw,380px)] gap-0" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <SheetTitle className="sr-only">Daily agenda</SheetTitle><SheetDescription className="sr-only">Schedule and edit time for your tasks.</SheetDescription>
      <Timeline />
    </SheetContent>
  </Sheet>
}

function Slot({ instant, top, hour }: { instant: number; top: number; hour: boolean }) {
  const { setNodeRef } = useDroppable({ id: `agenda-slot:${instant}`, data: { kind: 'agenda-slot', instant } })
  return <div ref={setNodeRef} className={`absolute right-0 left-0 border-t ${hour ? 'border-border' : 'border-border/40'}`} style={{ top, height: 15 * PIXELS_PER_MINUTE }}>
    {hour && <span className="pointer-events-none absolute left-1 top-1 w-16 text-[10px] leading-tight text-muted-foreground">{timeLabel(instant)}</span>}
  </div>
}

function Timeline() {
  const { day, setDay, setOpen, blocks, loading, error, reload, preview } = useAgenda()
  const scroll = useRef<HTMLDivElement>(null)
  const initialized = useRef('')
  const [now, setNow] = useState(() => Date.now())
  const { start, end, minutes } = dayBounds(day)
  const layout = useMemo(() => layoutBlocks(blocks, day), [blocks, day])
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    if (loading || error || initialized.current === day || !scroll.current) return
    const anchor = localDateKey() === day ? Date.now() : layout[0]?.start ?? start + 9 * 60 * MINUTE
    scroll.current.scrollTop = Math.max(0, ((anchor - start) / MINUTE - 60) * PIXELS_PER_MINUTE)
    initialized.current = day
  }, [day, loading, error, layout, start])
  const slots = Array.from({ length: Math.ceil(minutes / 15) }, (_, index) => start + index * 15 * MINUTE)
  return <>
    <div className="shrink-0 space-y-3 border-b p-3">
      <div className="flex items-center justify-between"><h2 className="font-heading font-semibold">Daily agenda</h2><Button size="icon" variant="ghost" aria-label="Close agenda" onClick={() => { setOpen(false); restoreFocus() }}><X /></Button></div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}><ChevronLeft /></Button>
        <Input className="min-w-0 flex-1" aria-label="Agenda date" type="date" required value={day} onChange={event => { if (event.target.value) setDay(event.target.value) }} />
        <Button size="icon" variant="ghost" aria-label="Next day" onClick={() => setDay(shiftDay(day, 1))}><ChevronRight /></Button>
        <Button size="sm" variant="outline" onClick={() => setDay(localDateKey())}>Today</Button>
      </div>
      <p className="text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · All plans & Inbox</p>
      {loading && <p role="status" className="text-xs text-muted-foreground">Loading agenda…</p>}
      {error && <div role="alert" className="text-sm text-destructive">{error}<Button size="sm" variant="outline" onClick={() => void reload()}>Retry</Button></div>}
      {!loading && !error && blocks.length === 0 && <p className="text-xs text-muted-foreground">Drag a task here, or choose “Schedule time” in its menu.</p>}
    </div>
    <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Daily timeline">
      <div className="relative mr-2" style={{ height: minutes * PIXELS_PER_MINUTE }}>
        {slots.map((instant, index) => <Slot key={instant} instant={instant} top={index * 15 * PIXELS_PER_MINUTE} hour={new Date(instant).getMinutes() === 0} />)}
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[72px]">
          {layout.map(item => <AgendaTaskBlock key={item.block.task_id} item={item} dayStart={start} />)}
          {preview && preview.end > start && preview.start < end && <div className="absolute right-0 left-0 z-20 rounded-md border-2 border-dashed border-blue-500 bg-blue-500/15 p-1 text-xs text-blue-700" style={{ top: (Math.max(start, preview.start) - start) / MINUTE * PIXELS_PER_MINUTE, height: (Math.min(end, preview.end) - Math.max(start, preview.start)) / MINUTE * PIXELS_PER_MINUTE }}>{timeLabel(preview.start)}</div>}
          {now >= start && now < end && <div className="absolute right-0 -left-1 z-30 border-t-2 border-red-500" style={{ top: (now - start) / MINUTE * PIXELS_PER_MINUTE }}><span className="absolute -top-1.5 left-0 size-2 rounded-full bg-red-500" /><span className="sr-only">Current time {timeLabel(now)}</span></div>}
        </div>
      </div>
    </div>
  </>
}
