import { getTasks } from '../../../components/tasks/queries'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'
import TaskClient from '@/components/layout/TaskClient'

export default async function InboxPage() {
  const tasks = await getTasks('today')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Today" />
      <TaskClient tasks={tasks} lists={lists} listId="" currentView="list" />
    </>
  )
}
