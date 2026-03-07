import { type KeyboardEvent } from 'react'
// import useCurrentListId from '@/hooks/useCurrentListId';
import { createClient } from '@/lib/supabase/server'

// type NewTaskPromptProps = {
//   setShowTaskInput: Dispatch<SetStateAction<boolean>>;
// };

async function NewTaskPrompt() {
  // const [taskName, setTaskName] = useState('');
  // const { dispatch } = useTasks();
  // const listId = useCurrentListId();
  const supabase = await createClient()

  async function addTask() {
    // if (!taskName) return;
    await supabase.from('tasks').insert([
      {
        title: 'test task',
      },
    ])
    // dispatch({
    //   type: TASK_ACTIONS.ADD,
    //   title: taskName,
    //   currentListId: listId,
    // })
    // setShowTaskInput(false);
    // setTaskName('');
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
            // setShowTaskInput(false);
          }
        }}
        // onChange={(e) => setTaskName(e.target.value)}
        // value={taskName}
        autoFocus
        className="outline-0"
      />
    </li>
  )
}

export default NewTaskPrompt
