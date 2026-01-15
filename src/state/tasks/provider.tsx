'use client'

import { createContext, useContext, useEffect, useReducer } from 'react'
import { tasksReducer } from './reducer'
import type { TaskAction } from './actions'
import type { Task } from './types'

const TASKS_KEY = 'planomy_tasks'

type TasksContextValue = {
  tasks: Task[]
  dispatch: React.Dispatch<TaskAction>
}

const TasksContext = createContext<TasksContextValue | null>(null)

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) {
    throw new Error('Tasks context error!')
  }
  return ctx
}

function taskInit() {
  try {
    const storedTasks = localStorage.getItem(TASKS_KEY)
    return storedTasks ? JSON.parse(storedTasks) : []
  } catch {
    return []
  }
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, dispatch] = useReducer(tasksReducer, [], taskInit)

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
    } catch {
      return
    }
  }, [tasks])

  return (
    <TasksContext.Provider value={{ tasks, dispatch }}>
      {children}
    </TasksContext.Provider>
  )
}
