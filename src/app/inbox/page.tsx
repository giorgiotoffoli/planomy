import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import CreateTaskButton from '../../components/tasks/create-task/create-task-button'
import CreateTaskDialog from '../../components/tasks/create-task/create-task-dialog'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase.from('tasks').select('*')

  return (
    <>
      <h1 className="text-2xl font-bold px-4 py-3">Inbox</h1>
      <Suspense fallback={<h1>Loading tasks...</h1>}>
        {tasks?.length ? (
          <ul>
            {tasks?.map((task) => (
              <li key={task.id}>{task.name}</li>
            ))}
          </ul>
        ) : (
          <p className="px-4">Great job! Everything is done</p>
        )}
      </Suspense>
      <CreateTaskDialog />
    </>
  )
}
