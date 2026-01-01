import type { KeyboardEvent } from "react";

type NewTaskPromptProps = {
  addTaskToTaskList: () => void;
  handleOnKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  taskName: string;
  setTaskName: (e: string) => void;
};

function NewTaskPrompt({
  addTaskToTaskList,
  handleOnKeyDown,
  taskName,
  setTaskName,
}: NewTaskPromptProps) {
  return (
    <li>
      <input
        type="text"
        placeholder="Insert task name..."
        onBlur={addTaskToTaskList}
        onKeyDown={handleOnKeyDown}
        onChange={(e) => setTaskName(e.target.value)}
        value={taskName}
        autoFocus
        className="outline-0"
      />
    </li>
  );
}

export default NewTaskPrompt;
