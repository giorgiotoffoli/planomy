'use client'

import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { getTasks } from '@/components/tasks/queries'
import { getAllEvents } from '@/components/events/actions'
import EventDialog from '@/components/events/event-dialog'
import { getUserLists } from '@/components/lists/queries'
import { getUserCategories } from '@/components/categories/queries'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { decryptString } from '@/lib/crypto/e2ee'
import { CalendarEventWithList, Category, List, TaskWithList } from '@/types'
import Link from 'next/link'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { ListEmoji } from '@/components/lists/list-emoji'
import { CalendarDays } from 'lucide-react'

interface SearchModalProps {
  setOpen: Dispatch<SetStateAction<boolean>>
}

export default function SearchModal({ setOpen }: SearchModalProps) {
  const { masterKey } = useE2EE()
  const [localTasks, setLocalTasks] = useState<TaskWithList[]>([])
  const [localEvents, setLocalEvents] = useState<CalendarEventWithList[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithList | null>(null)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLocaleLowerCase()

  useEffect(() => {
    if (!masterKey) return

    const unlockedMasterKey = masterKey

    async function loadAndDecryptTasks() {
      const [tasks, events, lists, categories] = await Promise.all([getTasks('all'), getAllEvents(), getUserLists(), getUserCategories()])

      const decryptedEvents = await Promise.all(events.map(async (event) => ({
        ...event,
        title: await decryptString(event.title, unlockedMasterKey),
        description: event.description ? await decryptString(event.description, unlockedMasterKey) : event.description,
        location: event.location ? await decryptString(event.location, unlockedMasterKey) : event.location,
        list: event.list ? {
          ...event.list,
          title: await decryptString(event.list.title, unlockedMasterKey),
          emoji: event.list.emoji ? await decryptString(event.list.emoji, unlockedMasterKey) : event.list.emoji,
        } : null,
      })))

      const decryptedTasks = await Promise.all(
        tasks.map(async (task) => ({
          ...task,
          title: await decryptString(task.title, unlockedMasterKey),
          notes: task.notes
            ? await decryptString(task.notes, unlockedMasterKey)
            : task.notes,
          list: task.list
            ? {
                ...task.list,
                title: await decryptString(task.list.title, unlockedMasterKey),
                emoji: task.list.emoji
                  ? await decryptString(task.list.emoji, unlockedMasterKey)
                  : task.list.emoji,
              }
            : task.list,
        })),
      )

      setLocalTasks(decryptedTasks)
      setLocalEvents(decryptedEvents)
      setLists(await Promise.all(lists.map(async (list) => ({ ...list, title: await decryptString(list.title, unlockedMasterKey), emoji: list.emoji ? await decryptString(list.emoji, unlockedMasterKey) : list.emoji, user_id: list.user_id }))))
      setCategories(await Promise.all(categories.map(async (category) => ({ ...category, title: await decryptString(category.title, unlockedMasterKey) }))))
    }

    loadAndDecryptTasks().catch((error) => {
      console.error('Failed to load or decrypt tasks', error)
    })
  }, [masterKey])

  const filteredTasks = useMemo(() => {
    if (!normalizedQuery) return []

    return localTasks.filter((task) => {
      const title = task.title.trim().toLocaleLowerCase()
      const notes = task.notes?.trim().toLocaleLowerCase()

      return title.includes(normalizedQuery) || notes?.includes(normalizedQuery)
    })
  }, [localTasks, normalizedQuery])

  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) return []
    return localEvents.filter((event) => [event.title, event.description, event.location, event.list?.title].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(normalizedQuery)))
  }, [localEvents, normalizedQuery])

  return (
    <Command>
      <CommandInput
        placeholder="Search tasks and events..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No tasks or events found.</CommandEmpty>

        <CommandGroup heading={filteredTasks.length !== 0 ? 'Tasks' : undefined}>
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={
                task.list_id
                  ? `/lists/${task.list_id}?view=${task.list?.default_view}&task=${task.id}`
                  : `/home?task=${task.id}`
              }
              onClick={() => setOpen(false)}
            >
              <CommandItem
                value={`${task.title} ${task.notes ?? ''}`}
              >
                <div className="min-w-0 flex flex-col">
                  <p>{task.title}</p>
                  <span className="truncate text-xs text-muted-foreground">
                    {task.notes}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {task.list && (
                      <span className="flex items-center gap-1">
                        <ListEmoji emoji={task.list.emoji} className="text-sm" />
                        {task.list.title}
                      </span>
                    )}
                  </span>
                </div>
              </CommandItem>
            </Link>
          ))}
        </CommandGroup>
        <CommandGroup heading={filteredEvents.length !== 0 ? 'Events' : undefined}>
          {filteredEvents.map((event) => (
            <CommandItem key={event.id} value={`${event.title} ${event.description ?? ''} ${event.location ?? ''}`} onSelect={() => { setEditingEvent(event) }}>
              <CalendarDays aria-hidden="true" />
              <div className="min-w-0 flex flex-col"><p className="truncate">{event.title}</p><span className="truncate text-xs text-muted-foreground">{event.all_day ? `${event.starts_on} · All day` : event.starts_at ? new Date(event.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Event'}{event.location ? ` · ${event.location}` : ''}</span></div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      {editingEvent ? <EventDialog lists={lists} categories={categories} event={editingEvent} open onOpenChange={(open) => { if (!open) setEditingEvent(null) }} /> : null}
    </Command>
  )
}
