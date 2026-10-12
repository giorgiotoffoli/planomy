import { getUserCategories } from '@/components/categories/queries'
import { getDeadlineTasks } from '@/components/tasks/queries'
import { getUserLists } from '@/components/lists/queries'
import DeadlinesPlanner from '@/components/deadlines/deadlines-planner'

export default async function DeadlinesPage() {
  const [tasks, lists, categories] = await Promise.all([
    getDeadlineTasks(),
    getUserLists(),
    getUserCategories(),
  ])

  return (
    <DeadlinesPlanner
      initialTasks={tasks}
      initialLists={lists}
      initialCategories={categories}
    />
  )
}
