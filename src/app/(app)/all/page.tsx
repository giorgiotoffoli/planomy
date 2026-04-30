import { getTasks } from '../../../components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import Header from '@/components/layout/header/Header'
import TaskClient from '@/components/layout/TaskClient'

export default async function AllPage() {
  const tasks = await getTasks('all')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="All" />
      {tasks.length === 0 && <p>All your tasks will be displayed here.</p>}
      <TaskClient tasks={tasks} lists={lists} currentView="list" />
    </>
  )
}
