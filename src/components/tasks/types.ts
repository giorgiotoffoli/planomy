export interface Task {
  user_id: string
  id: string
  list_id?: string
  title: string
  completed: boolean
  due_date?: string
  notes?: string
}

export interface List {
  user_id: string
  id: string
  title: string
}
