'use client'
import React, { useState } from 'react'
import { DndContext, UniqueIdentifier } from '@dnd-kit/core'

import Droppable from './Droppable'
import Draggable from './Draggable'
import { DragDropProvider } from '@dnd-kit/react'

export default function App() {
  const targets = ['A', 'B', 'C']
  const [target, setTarget] = useState<UniqueIdentifier | undefined>(undefined)
  const draggable = <Draggable id="draggable">Drag me</Draggable>
  const secondDraggable = <Draggable id="secondDraggable">Drag us!</Draggable>

  return (
    <>
      <h1 className="text-2xl font-bold">Kanban</h1>
      <DragDropProvider
        onDragEnd={(event) => {
          if (event.canceled) return

          setTarget(event.operation.target?.id)
        }}
      >
        {!target ? draggable : null}
        {!target ? secondDraggable : null}
        <div className="grid grid-cols-3">
          {targets.map((id) => (
            <Droppable key={id} id={id}>
              {target === id ? draggable : `Droppable ${id}`}
            </Droppable>
          ))}
        </div>
      </DragDropProvider>
    </>
  )
}
