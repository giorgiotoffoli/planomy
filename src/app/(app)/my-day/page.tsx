import { getUserLists } from '@/components/lists/queries'
import MyDayPlanner from '@/components/my-day/my-day-planner'

export default async function MyDayPage() {
  const lists = await getUserLists()
  return <MyDayPlanner encryptedLists={lists} />
}
