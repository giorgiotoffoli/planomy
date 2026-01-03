export interface Task {
    id: string;
    name: string;
    completed: boolean;
    dueDate?: string;
    dueTime?: string;
    list?: List;
    note?: string;
}

export interface List {
    id: string;
    title: string;
    icon?: React.ElementType
}