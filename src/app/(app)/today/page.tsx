import { getUserLists } from '@/components/lists/queries'
import TodayPlanner from '@/components/today/today-planner'

export default async function TodayPage() {
  const lists = await getUserLists()
  return <TodayPlanner encryptedLists={lists} />
}
