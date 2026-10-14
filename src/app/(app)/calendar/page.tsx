import CalendarPage from '@/components/calendar/calendar-page'
import { getUserCategories } from '@/components/categories/queries'
import { getUserLists } from '@/components/lists/queries'
import { getDeadlineTasks } from '@/components/tasks/queries'

export default async function CalendarRoute() {
  const [tasks, lists, categories] = await Promise.all([
    getDeadlineTasks(),
    getUserLists(),
    getUserCategories(),
  ])

  return (
    <CalendarPage
      initialTasks={tasks}
      initialLists={lists}
      initialCategories={categories}
    />
  )
}
