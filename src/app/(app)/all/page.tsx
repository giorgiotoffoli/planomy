import { getTasks } from '../../../components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import Header from '@/components/layout/header/app-header'
import TaskWorkspace from '@/components/layout/task-workspace'

export default async function AllPage() {
  const tasks = await getTasks('all')
  const lists = await getUserLists()

  return (
    <TaskWorkspace
      tasks={tasks}
      lists={lists}
      currentView="list"
      listId={null}
      headerTitle="All"
    />
  )
}
