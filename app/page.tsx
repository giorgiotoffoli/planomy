'use client'

import AppSidebar from '@/components/AppSidebar'
import TaskList from '@/components/TaskList'
import { defaultLists } from '@/data/AppLists'
import { Task, List } from '@/types/task'
import { useState, useEffect, useReducer } from 'react'

import type { TaskAction } from '@/types/task'
import { TASK_ACTIONS } from '@/types/task'

const TASKS_KEY = 'planomy_tasks'
const LISTS_KEY = 'planomy_lists'

function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case TASK_ACTIONS.ADD: {
      return [
        ...tasks,
        {
          id: crypto.randomUUID(),
          title: action.title,
          completed: false,
        },
      ]
    }
    case TASK_ACTIONS.DELETE: {
      return tasks.filter((t) => t.id !== action.id)
    }
    case TASK_ACTIONS.TOGGLE_COMPLETE: {
      return tasks.map((t) =>
        t.id === action.id ? { ...t, completed: !action.completed } : t
      )
    }
    case TASK_ACTIONS.RENAME: {
      return tasks.map((t) =>
        t.id === action.id ? { ...t, title: action.newTitle } : t
      )
    }
    case TASK_ACTIONS.SET_NOTE: {
      return tasks.map((t) =>
        t.id === action.id ? { ...t, note: action.note } : t
      )
    }
    case TASK_ACTIONS.SET_DATE: {
      return tasks.map((t) =>
        t.id === action.id ? { ...t, dueDate: action.date } : t
      )
    }
    default: {
      console.log(`${action} is not a valid task action`)
      return tasks
    }
  }
}

export default function Page() {
  const [tasks, dispatch] = useReducer(tasksReducer, [])
  const [taskList, setTaskList] = useState<Task[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [activeList, setActiveList] = useState<List>(defaultLists[0])

  // Prevent overwriting existing localStorage with [] on first paint
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem(TASKS_KEY)
      const storedLists = localStorage.getItem(LISTS_KEY)

      setTaskList(storedTasks ? JSON.parse(storedTasks) : [])
      setLists(storedLists ? JSON.parse(storedLists) : [])
    } catch {
      setTaskList([])
      setLists([])
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(TASKS_KEY, JSON.stringify(taskList))
  }, [taskList, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  }, [lists, hydrated])

  useEffect(() => {
    console.log(tasks)
  }, [tasks])

  const deleteListTasks = (list: List) => {
    // setTaskList((prev) => prev.filter((task) => task.list?.id !== list.id))
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        setActiveList={setActiveList}
        deleteListTasks={deleteListTasks}
        lists={lists}
        setLists={setLists}
      />
      <main className="w-full flex-1">
        <TaskList
          taskList={tasks}
          dispatch={dispatch}
          activeList={activeList}
          setTaskList={setTaskList}
          lists={lists}
        />
      </main>
    </div>
  )
}
