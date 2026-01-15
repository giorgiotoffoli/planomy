import VisibleTaskList from '@/components/VisibleTaskList'
import TaskListHeader from '@/components/TaskListHeader'

export default function TodayPage() {
  return (
    <>
      <TaskListHeader title="Today" />
      <VisibleTaskList view={{ kind: 'today' }} />
    </>
  )
}
