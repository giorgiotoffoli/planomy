import { getTasks } from '../../../components/tasks/queries'
import Header from '@/components/layout/header/Header'
import { getUserLists } from '@/components/lists/queries'
import TaskClient from '@/components/layout/TaskClient'

export default async function InboxPage() {
  const tasks = await getTasks('inbox')
  const lists = await getUserLists()

  return (
    <>
      <Header taskCount={tasks.length} headerTitle="Inbox" />
      {tasks.length === 0 ? (
        <p>Nothing in your inbox. Capture a task or enjoy the silence.</p>
      ) : (
        <TaskClient tasks={tasks} lists={lists} listId="" currentView="list" />
      )}
    </>
  )
}
