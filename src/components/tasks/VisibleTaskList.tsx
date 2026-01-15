'use client'

import TaskList from '@/components/tasks/TaskList'
import { useTasks } from '@/state/tasks/provider'
import { useMemo } from 'react'

type View =
  | { kind: 'inbox' }
  | { kind: 'all' }
  | { kind: 'scheduled' }
  | { kind: 'today' }
  | { kind: 'completed' }
  | { kind: 'list'; listId: string }

export default function VisibleTaskList({ view }: { view: View }) {
  const { tasks } = useTasks()

  const visibleTasks = useMemo(() => {
    switch (view.kind) {
      case 'inbox':
        return tasks.filter((task) => !task.listId)
      case 'all':
        return tasks
      case 'scheduled':
        return tasks.filter((task) => task.dueDate)
      case 'today': {
        const today = new Date()
        return tasks.filter(
          (task) => task.dueDate && task.dueDate === today.toISOString()
        )
      }
      case 'completed':
        return tasks.filter((task) => task.completed)
      case 'list':
        return tasks.filter((task) => task.listId === view.listId)
      default:
        return []
    }
  }, [tasks, view])

  return (
    <>
      <TaskList tasks={visibleTasks} />
    </>
  )
}
