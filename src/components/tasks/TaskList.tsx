'use client'

import { useState } from 'react'
import TaskItem from './TaskItem'
import NewTaskPrompt from './NewTaskPrompt'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { Task } from '@/state/tasks/types'

type TaskListProps = {
  tasks: Task[]
}

export function TaskList({ tasks }: TaskListProps) {
  const [showTaskInput, setShowTaskInput] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scroll-smooth pb-6">
        <ul className="px-4 py-3">
          {tasks.map((task) => (
            <TaskItem task={task} key={task.id} />
          ))}

          {!showTaskInput && tasks.length === 0 && (
            <h2>Great job! Everything is done.</h2>
          )}

          {showTaskInput && (
            <NewTaskPrompt setShowTaskInput={setShowTaskInput} />
          )}
        </ul>
      </div>
    </div>
  )
}

export default TaskList
