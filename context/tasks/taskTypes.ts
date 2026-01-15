export interface Task {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    dueTime?: string;
    listId?: string;
    note?: string;
}

