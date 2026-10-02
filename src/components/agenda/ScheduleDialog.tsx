'use client'

import { useEffect, useState } from 'react'
import type { TaskWithList, TimeBlock } from '@/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { localDateKey } from '@/lib/my-day'
import { localTimeCandidates, MINUTE, timeInput, timeLabel } from '@/lib/agenda'
import { getTaskTimeBlock } from './actions'
import { useAgenda } from './AgendaProvider'

export default function ScheduleDialog({ task, onClose, restoreFocus }: { task: TaskWithList; onClose: () => void; restoreFocus: () => void }) {
  const agenda = useAgenda()
  const [day, setDay] = useState(agenda.day)
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(30)
  const [occurrence, setOccurrence] = useState('')
  const [block, setBlock] = useState<TimeBlock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const busy = agenda.busy.has(task.id)
  useEffect(() => {
    let cancelled = false
    getTaskTimeBlock(task.id).then(result => {
      if (cancelled) return
      setBlock(result)
      if (result) {
        const start = Date.parse(result.starts_at)
        setDay(localDateKey(new Date(start))); setTime(timeInput(start))
        setDuration((Date.parse(result.ends_at) - start) / MINUTE)
        setOccurrence(String(start))
      }
      setError(null); setLoading(false)
    }).catch(cause => { if (!cancelled) { setError(cause instanceof Error ? cause.message : 'Schedule could not be loaded.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [task.id, retry])
  const candidates = day ? localTimeCandidates(day, time) : []
  const chosen = candidates.length === 1 ? candidates[0] : candidates.find(instant => String(instant) === occurrence)
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose() }}>
    <DialogContent className="sm:max-w-md" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <DialogHeader><DialogTitle>{block ? 'Edit scheduled time' : 'Schedule time'}</DialogTitle><DialogDescription>{task.title}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        if (chosen === undefined || loading || error || !Number.isFinite(duration) || duration < 15) return
        if (await agenda.save(task, chosen, chosen + duration * MINUTE)) { agenda.setDay(day); agenda.setOpen(true); onClose() }
      }}>
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading scheduled time…</p>}
        {error && <div role="alert" className="text-sm text-destructive">{error}<Button type="button" variant="outline" onClick={() => { setLoading(true); setRetry(value => value + 1) }}>Retry</Button></div>}
        <fieldset disabled={loading || busy || Boolean(error)} className="space-y-4">
          <label className="block space-y-2 text-sm">Date<Input type="date" required value={day} onChange={event => { setDay(event.target.value); setOccurrence('') }} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2 text-sm">Start time<Input type="time" required step={60} value={time} onChange={event => { setTime(event.target.value); setOccurrence('') }} /></label>
            <label className="block space-y-2 text-sm">Duration (minutes)<Input type="number" required min={15} step="any" value={duration} onChange={event => setDuration(Number(event.target.value))} /></label>
          </div>
          {candidates.length === 0 && <p role="alert" className="text-sm text-destructive">This local time does not exist. Choose another time.</p>}
          {candidates.length > 1 && <label className="block space-y-2 text-sm">This time occurs twice. Choose an occurrence:
            <select className="w-full rounded-md border bg-background p-2" required value={occurrence} onChange={event => setOccurrence(event.target.value)}>
              <option value="">Choose a time</option>
              {candidates.map((instant, index) => <option key={instant} value={instant}>{index === 0 ? 'First' : 'Second'} · {timeLabel(instant)}</option>)}
            </select>
          </label>}
          <p className="text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · Duration is elapsed time. Deadlines and My Day selections stay as they are.</p>
          {chosen !== undefined && duration >= 15 && <p className="text-xs text-muted-foreground">Ends {new Date(chosen + duration * MINUTE).toLocaleDateString()} at {timeLabel(chosen + duration * MINUTE)}</p>}
        </fieldset>
        <DialogFooter className="gap-2">
          {block && <Button type="button" variant="destructive" disabled={busy || loading || Boolean(error)} onClick={async () => { if (await agenda.remove(task.id)) onClose() }}>Remove time block</Button>}
          <Button type="submit" disabled={busy || loading || Boolean(error) || chosen === undefined}>{busy ? 'Saving…' : 'Save time'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
