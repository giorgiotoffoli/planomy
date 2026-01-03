import TaskList from './components/TaskList'
import { useState, useEffect } from 'react'
import AppSidebar from './components/AppSidebar'
import type { Task, List } from './types/task'
import { defaultLists } from './data/AppLists'

function App() {
  const TASKS_KEY = 'planomy_tasks'
  const LISTS_KEY = 'planomy_lists'

  const [taskList, setTaskList] = useState<Task[]>(() => {
    const stored = localStorage.getItem(TASKS_KEY)
    return stored ? JSON.parse(stored) : []
  })

  const [lists, setLists] = useState<List[]>(() => {
    const stored = localStorage.getItem(LISTS_KEY)
    return stored ? JSON.parse(stored) : []
  })

  const [activeList, setActiveList] = useState<List>(defaultLists[0])

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(taskList))
  }, [taskList])

  useEffect(() => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  }, [lists])

  const deleteListTasks = (list: List) => {
    setTaskList((prev) => prev.filter((task) => task.list?.id !== list.id))
  }

  // const changeListTitle = (list: List) => {
  //   setLists(prevLists => prevLists.map(listItem => (listItem.id === list.id) ? [...prevLists, ]

  //   ))
  // } coming soon!

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar
          activeList={activeList}
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
    </>
  )
}

export default App
