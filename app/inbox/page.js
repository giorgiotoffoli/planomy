import VisibleTaskList from '@/components/VisibleTaskList'
import TaskListHeader from '@/components/TaskListHeader'

export default function InboxPage() {
  return (
    <>
      <TaskListHeader title="Inbox" />
      <VisibleTaskList view={{ kind: 'inbox' }} />
    </>
  )
}
