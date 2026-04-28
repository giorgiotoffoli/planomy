import TaskList from '@/components/lists/TaskList'
import { getTasks } from '../../../components/tasks/queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'

export default async function CompletedPage() {
  const tasks = await getTasks('completed')
  const lists = await getUserLists()
  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Completed" />
      {tasks.length === 0 ? (
        <p>Completed tasks will appear here.</p>
      ) : (
        <Suspense fallback={<h1>Loading tasks...</h1>}>
          <TaskList tasks={tasks} lists={lists} />
        </Suspense>
      )}
    </>
  )
}
