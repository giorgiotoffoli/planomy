import VisibleTaskList from '@/components/tasks/VisibleTaskList'
import TaskListHeader from '@/components/tasks/TaskListHeader'

export default function TodayPage() {
  return (
    <>
      <TaskListHeader title="Today" />
      <VisibleTaskList view={{ kind: 'today' }} />
    </>
  )
}
