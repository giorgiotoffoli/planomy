'use client'
import { TaskWithList } from '../../../types'
import { useState } from 'react'

interface TaskTitleProps {
  task: TaskWithList
  handleOnRename: (taskId: string, newName: string) => void
}

export function TaskTitle({ task, handleOnRename }: TaskTitleProps) {
  const [isEditingTaskTitle, setIsEditingTaskTitle] = useState(false)
  return (
    <>
      {isEditingTaskTitle ? (
        <form
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)

            const taskId = formData.get('id') as string
            const newTitle = formData.get('newTitle') as string

            const trimmedTitle = newTitle.trim()

            handleOnRename(taskId, trimmedTitle)

            setIsEditingTaskTitle(false)
          }}
        >
          <input type="hidden" name="id" value={task.id} />

          <input
            className={`outline-0 w-full ${
              task.completed ? 'opacity-75 line-through' : 'my-auto'
            }`}
            type="text"
            name="newTitle"
            defaultValue={task.title}
            onBlur={(e) => {
              if (e.currentTarget.value.trim() !== task.title.trim()) {
                e.currentTarget.form?.requestSubmit()
              }
              setIsEditingTaskTitle(false)
            }}
            placeholder="Edit task name..."
          />
        </form>
      ) : (
        <span
          className={`outline-0 w-full ${
            task.completed ? 'opacity-75 line-through' : 'my-auto'
          }`}
          onClick={() => setIsEditingTaskTitle(true)}
        >
          {task.title}
        </span>
      )}
    </>
  )
}
