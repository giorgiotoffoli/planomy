import {
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

type NewListModalProps = {
  ref: RefObject<HTMLDialogElement | null>;
  setFilterList: Dispatch<SetStateAction<string[]>>;
};

function NewListModal({ ref, setFilterList }: NewListModalProps) {
  const [filterName, setFilterName] = useState<string>("");

  return (
    <dialog
      ref={ref}
      className="m-auto w-md h-1/4 rounded-2xl border-2 border-gray-400"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl ">Create new List</h1>
          <button
            className="text-black cursor-pointer"
            onClick={() => ref.current?.close()}
          >
            ⨉
          </button>
        </div>

        <p className="text-sm opacity-75 italic">
          Lists are used to organize your tasks.
        </p>
        <div className="p-4">
          <label htmlFor="input" className="p-3">
            List name:
          </label>
          <input
            type="text"
            placeholder="Groceries, Homework..."
            onChange={(e) => setFilterName(e.target.value)}
          />
        </div>
        <button
          className="bg-blue-500 p-2 rounded-2xl hover:bg-blue-600 cursor-pointer transition-colors duration-200 text-white"
          onClick={() =>
            setFilterList((prevFilters) => [...prevFilters, filterName])
          }
        >
          Confirm
        </button>
      </div>
    </dialog>
  );
}

export default NewListModal;
