import { getTasks } from '../../../components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import TaskClient from '@/components/layout/TaskClient'

export default async function InboxPage() {
  const tasks = await getTasks('today')
  const lists = await getUserLists()

  return (
    <TaskClient
      tasks={tasks}
      lists={lists}
      listId={null}
      currentView="list"
      headerTitle="Today"
    />
  )
}
