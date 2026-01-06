'use client'

import { useEffect, useState } from 'react'
import TaskList from '@/components/TaskList'
import AppSidebar from '@/components/AppSidebar'
import type { Task, List } from '@/types/task'
import { defaultLists } from '@/data/AppLists'

const TASKS_KEY = 'planomy_tasks'
const LISTS_KEY = 'planomy_lists'

export default function Page() {
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

  const deleteListTasks = (list: List) => {
    setTaskList((prev) => prev.filter((task) => task.list?.id !== list.id))
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
          activeList={activeList}
          taskList={taskList}
          setTaskList={setTaskList}
          lists={lists}
        />
      </main>
    </div>
  )
}
