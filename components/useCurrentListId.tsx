import { usePathname, useParams } from 'next/navigation'

export default function useCurrentListId() {
  const pathname = usePathname()
  const params = useParams()

  if (!pathname.startsWith('/lists/')) return undefined

  const raw = params?.listId
  return typeof raw !== 'string' ? undefined : raw
}
