import { getTasks } from '../../../components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import TaskClient from '@/components/layout/TaskClient'

export default async function ScheduledPage() {
  const tasks = await getTasks('scheduled')
  const lists = await getUserLists()

  return (
    <TaskClient
      tasks={tasks}
      lists={lists}
      listId={null}
      currentView="list"
      headerTitle="Scheduled"
    />
  )
}
