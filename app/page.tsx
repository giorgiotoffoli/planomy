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
          list: action.currentList,
        },
      ]
    }
    case TASK_ACTIONS.DELETE: {
      if (!action.id) {
        return tasks.filter((t) => t.list !== action.currentList)
      }

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

// lazy initializer
function init() {
  try {
    const storedTasks = localStorage.getItem(TASKS_KEY)
    return storedTasks ? JSON.parse(storedTasks) : []
  } catch {
    return []
  }
}

function listsInit() {
  try {
    const storedLists = localStorage.getItem(LISTS_KEY)
    return storedLists ? JSON.parse(storedLists) : []
  } catch {
    return []
  }
}

export default function Page() {
  const [tasks, dispatch] = useReducer(tasksReducer, [], init)
  const [lists, setLists] = useState<List[]>(listsInit)
  const [activeList, setActiveList] = useState<List>(defaultLists[0])

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
    } catch {
      return
    }
  }, [tasks])

  useEffect(() => {
    try {
      localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
    } catch {
      return
    }
  }, [lists])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        setActiveList={setActiveList}
        lists={lists}
        setLists={setLists}
        dispatch={dispatch}
      />
      <main className="w-full flex-1">
        <TaskList
          taskList={tasks}
          dispatch={dispatch}
          activeList={activeList}
          lists={lists}
        />
      </main>
    </div>
  )
}
