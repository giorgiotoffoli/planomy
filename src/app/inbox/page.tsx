import VisibleTaskList from '@/components/tasks/VisibleTaskList'
import TaskListHeader from '@/components/tasks/TaskListHeader'

export default function InboxPage() {
  return (
    <>
      <TaskListHeader title="Inbox" />
      <VisibleTaskList view={{ kind: 'inbox' }} />
    </>
  )
}
