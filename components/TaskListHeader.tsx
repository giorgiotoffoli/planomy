type TaskListHeaderProps = {
  title: string
}

export default function TaskListHeader({ title }: TaskListHeaderProps) {
  return (
    <header>
      <h1 className="text-3xl font-bold px-5 pt-3">{title}</h1>
    </header>
  )
}
