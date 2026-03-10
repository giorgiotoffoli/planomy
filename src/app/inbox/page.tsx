import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import CreateTaskDialog from '../../components/tasks/create-task/CreateTaskDialog'
import { redirect } from 'next/navigation'
import { signOut } from '../auth/actions'
import TaskList from '@/components/tasks/TaskList'
import CreateTaskButton from '@/components/tasks/create-task/CreateTaskButton'
import { Button } from '@/components/ui/button'

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user!.id)
    .is('list_id', null)

  if (error) {
    throw new Error(error.message)
  }

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
