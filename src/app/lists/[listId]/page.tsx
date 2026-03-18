import { getListTasks } from '@/components/lists/queries'
import TaskList from '@/components/tasks/TaskList'
import CreateTaskButton from '@/components/tasks/create-task/CreateTaskButton'
import CreateTaskDialog from '@/components/tasks/create-task/CreateTaskDialog'
import { Suspense } from 'react'

export default async function InboxPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const tasks = await getListTasks((await params).listId)

  return (
    <>
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        <TaskList tasks={tasks} />
      </Suspense>
    </>
  )
}
