'use client'

import { TASK_ACTIONS } from '@/context/tasks/tasksActions'
import { useTasks } from '@/context/tasks/TasksProvider'
import { Dispatch, SetStateAction, useState, type KeyboardEvent } from 'react'
import useCurrentListId from './useCurrentListId'

type NewTaskPromptProps = {
  setShowTaskInput: Dispatch<SetStateAction<boolean>>
}

function NewTaskPrompt({ setShowTaskInput }: NewTaskPromptProps) {
  const [taskName, setTaskName] = useState('')
  const { dispatch } = useTasks()

  const listId = useCurrentListId()

  const addTask = () => {
    if (!taskName) return
    dispatch({
      type: TASK_ACTIONS.ADD,
      title: taskName,
      currentListId: listId,
    })
    setShowTaskInput(false)
    setTaskName('')
  }

  return (
    <li>
      <input
        type="text"
        placeholder="Insert task name..."
        onBlur={addTask}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            addTask()
          } else if (e.key === 'Escape') {
            setShowTaskInput(false)
          }
        }}
        onChange={(e) => setTaskName(e.target.value)}
        value={taskName}
        autoFocus
        className="outline-0"
      />
    </li>
  )
}

export default NewTaskPrompt
