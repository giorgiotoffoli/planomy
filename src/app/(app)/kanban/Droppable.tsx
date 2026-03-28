import { useDroppable } from '@dnd-kit/react'
import { ReactNode } from 'react'

export default function Droppable({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  const { ref } = useDroppable({
    id,
  })

  return (
    <div ref={ref} className="w-32 h-screen bg-green-200">
      {children}
    </div>
  )
}
