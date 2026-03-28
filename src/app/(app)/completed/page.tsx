import TaskList from '@/components/layout/TaskList'
import { getTasks } from '../../queries'
import { Suspense } from 'react'
import Header from '@/components/layout/header/Header'

export default async function CompletedPage() {
  const tasks = await getTasks('completed')
  const lists = await getUserLists()
  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Completed" />
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} lists={lists} />
      </Suspense>
    </>
  )
}
