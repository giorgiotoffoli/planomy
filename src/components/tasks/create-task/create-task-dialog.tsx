import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import CreateTaskButton from './create-task-button'
import { Button } from '@/components/ui/button'

export default function CreateTaskDialog() {
  return (
    <Dialog>
      <DialogTrigger>
        <CreateTaskButton />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create Task</DialogTitle>
        <DialogDescription>
          Create a custom list to organize your tasks.
        </DialogDescription>
        {/* Form goes here */}
        <DialogFooter>
          <DialogClose>
            <Button variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>

          <DialogClose>
            {/* <Button
              className="cursor-pointer"
              onClick={() => {
                listsDispatch({
                  type: LIST_ACTIONS.ADD,
                  title: listTitle,
                })
                setListTitle('')
              }}
            >
              Create
            </Button> */}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
