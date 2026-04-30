import { getTasks } from '../../../components/tasks/queries'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'
import TaskClient from '@/components/layout/TaskClient'

export default async function CompletedPage() {
  const tasks = await getTasks('completed')
  const lists = await getUserLists()
  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Completed" />
      {tasks.length === 0 && <p>Completed tasks will appear here.</p>}
      <TaskClient tasks={tasks} lists={lists} currentView="list" />
    </>
  )
}
