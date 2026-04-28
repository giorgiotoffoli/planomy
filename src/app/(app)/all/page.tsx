import TaskList from '@/components/lists/TaskList'
import { getTasks } from '../../../components/tasks/queries'
import { Suspense } from 'react'
import { getUserLists } from '@/components/lists/queries'
import Header from '@/components/layout/header/Header'

export default async function AllPage() {
  const tasks = await getTasks('all')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="All" />
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} lists={lists} />
      </Suspense>
    </>
  )
}
