import { ListsProvider } from '@/state/lists/provider'
import { TasksProvider } from '@/state/tasks/provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ListsProvider>
      <TasksProvider>{children}</TasksProvider>
    </ListsProvider>
  )
}
