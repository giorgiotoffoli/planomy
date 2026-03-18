import TaskList from '@/components/tasks/TaskList'
import { getTasks } from '../queries'
import { Suspense } from 'react'

export default async function InboxPage() {
  const tasks = await getTasks('inbox')

  return (
    <>
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} />
      </Suspense>
    </>
  )
}
