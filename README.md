<p align="center">
  <img src="src/app/readme-banner.png" alt="Planomy">
</p>

# Planomy

Planomy is an open-source, end-to-end encrypted task manager for organizing
work without giving up privacy. It separates attention, due dates, organization,
planned work, and history in a responsive web application.

> [!WARNING]
> Planomy is in beta. Features and data models may change between releases.

## Features

- **Home**: see what needs your attention now across every list, with up to
  three persistent Focus tasks, deadline protection, and a place for everything
  else
- **Deadlines**: see incomplete tasks with due dates grouped into Past Due,
  Today, Tomorrow, This Week, and Later. Focused and Stashed tasks remain
  visible so organization never hides a deadline
- **Lists and inbox**: capture unassigned tasks or organize them into multiple
  plans without duplicating task data. Inbox is an organization state, not a
  separate primary screen
- **List and Kanban views**: switch between focused lists and visual boards
- **Daily agenda**: plan working time beside your workspace. Drag tasks into
  time blocks, then move or resize them independently of deadlines
- **Completed**: review task history after work is finished
- **Task workflows**: create, edit, move, complete, reopen, search, sort, and
  review tasks across each planning surface
- **Responsive interface**: use the same planning workflows on desktop and
  mobile layouts
- **End-to-end encryption**: task titles, notes, and list names are encrypted
  in the browser before being stored

## How Planomy organizes work

Planomy gives each planning question its own surface:

- **Home**: what needs my attention
- **Deadlines**: when things are due
- **Lists**: how things are organized
- **Agenda**: when I plan to work
- **Completed**: task history

## Privacy

Planomy's server stores encrypted planner content. Plaintext task titles,
notes, and list names are available only in the browser while the user's vault
is unlocked. Home stores task state and references rather than copies of task
content.

## Technology

- Next.js, React, and TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth and PostgreSQL
- Web Crypto-based end-to-end encryption

## Roadmap

### Available now

- [x] End-to-end encrypted task and list content
- [x] Home, Deadlines, Lists, task search, sorting, and completed-task history
- [x] Due dates grouped by local calendar urgency with automatic Home deadline
  protection
- [x] Daily agenda time blocks kept separate from task deadlines
- [x] List and Kanban board layouts
- [x] Persistent Focus, Stashed tasks, and local-date-aware Home updates
- [x] Optimistic task updates and responsive navigation

### Planned

- [ ] Mobile applications
- [ ] Offline-first synchronization
- [ ] Shared plans and collaboration
- [ ] Accessibility and performance improvements

## Contributing

Issues and pull requests are welcome. Please keep changes focused, preserve the
project's encryption boundaries, and include relevant verification with each
contribution.
