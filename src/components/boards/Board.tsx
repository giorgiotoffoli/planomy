// 'use client'
// import { useState } from 'react'
// import { UniqueIdentifier } from '@dnd-kit/core'

// import { DragDropProvider } from '@dnd-kit/react'
// import BoardColumn from '@/components/boards/BoardColumn'
// import BoardTaskCard from '@/components/boards/BoardTaskCard'
// import { Task, TaskWithList } from '../tasks/types'

// export default function TaskBoard(tasks: TaskWithList[]) {
//   const targets = ['A', 'B', 'C']
//   const [target, setTarget] = useState<UniqueIdentifier | undefined>(undefined)

//   tasks?.map((task) => {
//     return <BoardTaskCard task={task} />
//   })

//   return (
//     <>
//       <DragDropProvider
//         onDragEnd={(event) => {
//           if (event.canceled) return

//           setTarget(event.operation.target?.id)
//         }}
//       >
//         {!target ? draggable : null}
//         <div className="grid grid-cols-3 h-full gap-3">
//           {targets.map((id) => (
//             <BoardColumn key={id} id={id}>
//               {target === id && draggable}
//             </BoardColumn>
//           ))}
//         </div>
//       </DragDropProvider>
//     </>
//   )
// }
