'use client'

import AppSidebar from '@/components/AppSidebar'
import TaskList from '@/components/TaskList'
import { defaultLists } from '@/data/AppLists'
import { Task, List } from '@/types/task'
import { useState, useEffect, useReducer } from 'react'

import type { TaskAction } from '@/types/task'
import { TASK_ACTIONS } from '@/types/task'

import { ListsAction } from '@/types/task'
import { LIST_ACTIONS } from '@/types/task'

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
          listId: action.currentListId,
        },
      ]
    }
    case TASK_ACTIONS.DELETE: {
      if (!action.id) {
        return tasks.filter((t) => t.listId !== action.currentListId)
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

function listsReducer(lists: List[], action: ListsAction): List[] {
  switch (action.type) {
    case LIST_ACTIONS.ADD: {
      if (action.title) {
        return [
          ...lists,
          {
            id: crypto.randomUUID(),
            title: action.title,
          },
        ]
      }
      return lists
    }
    case LIST_ACTIONS.DELETE: {
      return lists.filter((list) => list.id !== action.listId)
    }
    case LIST_ACTIONS.RENAME: {
      return lists.map((list) =>
        list.id === action.listId ? { ...list, title: action.newTitle } : list
      )
    }
    default:
      return lists
  }
}

// lazy initializer
function taskInit() {
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
  const [tasks, tasksDispatch] = useReducer(tasksReducer, [], taskInit)
  const [lists, listsDispatch] = useReducer(listsReducer, [], listsInit)
  const [activeList, setActiveList] = useState<List>(defaultLists[0])

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
    } catch {
      return
    }
    console.log(tasks)
  }, [tasks])

  useEffect(() => {
    try {
      localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
    } catch {
      return
    }
    console.log(lists)
  }, [lists])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        setActiveList={setActiveList}
        lists={lists}
        tasksDispatch={tasksDispatch}
        listsDispatch={listsDispatch}
      />
      <main className="w-full flex-1">
        <TaskList
          taskList={tasks}
          tasksDispatch={tasksDispatch}
          activeList={activeList}
          lists={lists}
        />
      </main>
    </div>
  )
}
