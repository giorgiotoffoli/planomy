import { ListsProvider } from '@/context/lists/ListsProvider'
import { TasksProvider } from '@/context/tasks/TasksProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ListsProvider>
      <TasksProvider>{children}</TasksProvider>
    </ListsProvider>
  )
}
