'use client'

import {
  Dispatch,
  SetStateAction,
  useState,
  type ActionDispatch,
  type KeyboardEvent,
} from 'react'

import type { List, TaskAction } from '@/types/task'
import { TASK_ACTIONS } from '@/types/task'

type NewTaskPromptProps = {
  tasksDispatch: ActionDispatch<[action: TaskAction]>
  setShowTaskInput: Dispatch<SetStateAction<boolean>>
  activeList: List
}

function NewTaskPrompt({
  tasksDispatch,
  setShowTaskInput,
  activeList,
}: NewTaskPromptProps) {
  const [taskName, setTaskName] = useState('')

  const addTask = () => {
    if (!taskName) return
    tasksDispatch({
      type: TASK_ACTIONS.ADD,
      title: taskName,
      currentListId: activeList.id,
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
