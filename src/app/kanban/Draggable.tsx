import { useDraggable } from '@dnd-kit/react'
import { ReactNode } from 'react'

export default function Draggable({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  const { ref } = useDraggable({
    id,
  })

  return (
    <button ref={ref} className="bg-amber-200 h-26 w-26">
      {children}
    </button>
  )
}
