import { router } from 'expo-router'

export type AddTaskReturnHref = '/home' | '/home/deadlines' | '/calendar' | '/lists'

let addTaskReturnHref: AddTaskReturnHref = '/home'

export function rememberAddTaskReturnPath(pathname: string) {
  if (pathname.startsWith('/home/deadlines') || pathname === '/deadlines') {
    addTaskReturnHref = '/home/deadlines'
  } else if (pathname.startsWith('/home') || pathname.startsWith('/main')) {
    addTaskReturnHref = '/home'
  } else if (pathname.startsWith('/calendar')) {
    addTaskReturnHref = '/calendar'
  } else if (pathname.startsWith('/lists')) {
    addTaskReturnHref = '/lists'
  }
}

export function openAddTask(href: AddTaskReturnHref) {
  addTaskReturnHref = href
  router.push('/add-task')
}

export function getAddTaskReturnHref() {
  return addTaskReturnHref
}
