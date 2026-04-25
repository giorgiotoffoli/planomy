import { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { useDroppable } from '@dnd-kit/react'

interface BoardColumnProps {
  children: ReactNode
  id: string
}

export default function BoardColumn({ children, id }: BoardColumnProps) {
  const { ref } = useDroppable({
    id,
  })
  return (
    <Card ref={ref}>
      <CardHeader className="font-bold">Column Title</CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
