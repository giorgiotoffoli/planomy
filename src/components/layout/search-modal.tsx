'use client'

import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { getTasks } from '@/components/tasks/queries'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { decryptString } from '@/lib/crypto/e2ee'
import { TaskWithList } from '@/types'
import Link from 'next/link'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'

interface SearchModalProps {
  setOpen: Dispatch<SetStateAction<boolean>>
}

export default function SearchModal({ setOpen }: SearchModalProps) {
  const { masterKey } = useE2EE()
  const [localTasks, setLocalTasks] = useState<TaskWithList[]>([])
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLocaleLowerCase()

  useEffect(() => {
    if (!masterKey) return

    const unlockedMasterKey = masterKey

    async function loadAndDecryptTasks() {
      const tasks = await getTasks('all')

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
              }
            : task.list,
        })),
      )

      setLocalTasks(decryptedTasks)
    }

    loadAndDecryptTasks().catch((error) => {
      console.error('Failed to load or decrypt tasks', error)
    })
  }, [masterKey])

  useMemo(() => {
    if (!normalizedQuery) return []

    return localTasks.filter((task) => {
      const title = task.title.trim().toLocaleLowerCase()
      const notes = task.notes?.trim().toLocaleLowerCase()

      return title.includes(normalizedQuery) || notes?.includes(normalizedQuery)
    })
  }, [localTasks, normalizedQuery])

  return (
    <Command>
      <CommandInput placeholder="Search tasks..." />
      <CommandList>
        <CommandEmpty>No tasks found.</CommandEmpty>

        <CommandGroup heading={localTasks.length !== 0 && 'Tasks'}>
          {localTasks.map((task) => (
            <Link
              href={
                task.list_id
                  ? `/lists/${task.list_id}?view=${task.list?.default_view}&task=${task.id}`
                  : `/inbox&task=${task.id}`
              }
              onClick={() => setOpen(false)}
            >
              <CommandItem
                key={task.id}
                value={`${task.title} ${task.notes ?? ''}`}
              >
                <div className="min-w-0 flex flex-col">
                  <p>{task.title}</p>
                  <span className="truncate text-xs text-muted-foreground">
                    {task.notes}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {task.list?.title}
                  </span>
                </div>
              </CommandItem>
            </Link>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
