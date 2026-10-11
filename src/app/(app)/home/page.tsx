import { getHomeData } from '@/components/home/queries'
import HomePlanner from '@/components/home/home-planner'

export default async function HomePage() {
  const data = await getHomeData()

  return <HomePlanner initialData={data} />
}
