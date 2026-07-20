'use client'
import { TaskWithList } from '../../../types'
import { useState } from 'react'

interface TaskTitleProps {
  task: TaskWithList
  handleOnRename: (taskId: string, newName: string) => void
}

export function TaskTitle({ task, handleOnRename }: TaskTitleProps) {
  const [isEditingTaskTitle, setIsEditingTaskTitle] = useState(false)

  const saveTitle = (input: HTMLInputElement) => {
    const trimmedTitle = input.value.trim()

    if (trimmedTitle && trimmedTitle !== task.title.trim()) {
      handleOnRename(task.id, trimmedTitle)
    }

    setIsEditingTaskTitle(false)
  }

  return isEditingTaskTitle ? (
    <input
      className={`inline-block min-w-0 flex-1 bg-transparent outline-none underline decoration-blue-500 ${
        task.completed ? 'opacity-75 line-through' : ''
      }`}
      type="text"
      defaultValue={task.title}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          saveTitle(e.currentTarget)
        }

        if (e.key === 'Escape') {
          setIsEditingTaskTitle(false)
        }
      }}
      onBlur={(e) => saveTitle(e.currentTarget)}
      placeholder="Edit task name..."
    />
  ) : (
    <span
      className={task.completed ? 'opacity-75 line-through' : ''}
      onClick={() => setIsEditingTaskTitle(true)}
    >
      {task.title}
    </span>
  )
}
