'use client'
import { renameTask } from '@/components/tasks/actions'
import { Task } from '../../../types'
import { useState } from 'react'

export function TaskTitle({ task }: { task: Task }) {
  const [isEditingTaskTitle, setIsEditingTaskTitle] = useState(false)
  return (
    <>
      {isEditingTaskTitle ? (
        <form
          className="w-full"
          action={renameTask}
          onSubmit={() => setIsEditingTaskTitle(false)}
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
