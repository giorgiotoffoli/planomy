export interface Task {
    id: string;
    name: string;
    completed: boolean;
    dueDate?: string;
    dueTime?: string;
    filter: string;
    note?: string;
}

export interface List {
    id: string;
    title: string;
}