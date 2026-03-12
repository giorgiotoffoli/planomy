import CreateTaskDialog from '../../components/tasks/create-task/CreateTaskDialog'
import TaskList from '@/components/tasks/TaskList'
import CreateTaskButton from '@/components/tasks/create-task/CreateTaskButton'
import { getTasks } from '../queries'
import { Suspense } from 'react'

export default async function InboxPage() {
  const tasks = await getTasks('scheduled')

  return (
    <>
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} />
      </Suspense>
      <CreateTaskDialog>
        <CreateTaskButton />
      </CreateTaskDialog>
    </>
  )
}
