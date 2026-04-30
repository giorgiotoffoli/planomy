import { getTasks } from '../../../components/tasks/queries'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'
import TaskClient from '@/components/layout/TaskClient'

export default async function InboxPage() {
  const tasks = await getTasks('scheduled')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Scheduled" />
      <TaskClient tasks={tasks} lists={lists} listId="" currentView="list" />
    </>
  )
}
