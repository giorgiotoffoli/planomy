import { router } from 'expo-router'
import { TaskScreen } from '@/features/home/task-screen'

export default function AddTaskSheet() {
  return <TaskScreen onDone={() => router.back()} />
}
