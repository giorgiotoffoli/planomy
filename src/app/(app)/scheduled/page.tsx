import { getTasks } from '../../../components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import TaskWorkspace from '@/components/layout/task-workspace'

export default async function ScheduledPage() {
  const tasks = await getTasks('scheduled')
  const lists = await getUserLists()

  return (
    <TaskWorkspace
      tasks={tasks}
      lists={lists}
      listId={null}
      currentView="list"
      headerTitle="Scheduled"
    />
  )
}
