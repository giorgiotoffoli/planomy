export interface Task {
  user_id: string
  id: string
  list_id?: string | null
  title: string
  completed: boolean
  due_date: string | null
  notes?: string
  status_id?: string | null
}

export interface TaskWithList extends Task {
  list: {
    id: string
    title: string
  } | null
}

export interface List {
  user_id: string
  id: string
  title: string
  default_view: string
}

export interface Status {
  id: string
  list_id: string
  title: string
  position: number
}
