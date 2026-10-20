import { getTasks } from '../../../components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import TaskWorkspace from '@/components/layout/task-workspace'

export default async function CompletedPage() {
  const tasks = await getTasks('completed')
  const lists = await getUserLists()
  return (
    <TaskWorkspace
      tasks={tasks}
      lists={lists}
      currentView="list"
      listId={null}
      headerTitle="Archive"
    />
  )
}
