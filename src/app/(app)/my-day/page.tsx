import { getUserLists } from '@/components/lists/queries'
import MyDayClient from '@/components/my-day/MyDayClient'

export default async function MyDayPage() {
  const lists = await getUserLists()
  return <MyDayClient encryptedLists={lists} />
}
