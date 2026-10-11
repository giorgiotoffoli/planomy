<p align="center">
  <img src="src/app/readme-banner.png" alt="Planomy">
</p>

# Planomy

Planomy is an open-source, end-to-end encrypted task manager for organizing
work without giving up privacy. It combines an attention-first Home workspace,
flexible lists, scheduling, and board views in a responsive web application.

> [!WARNING]
> Planomy is in beta. Features and data models may change between releases.

## Features

- **Home** — see what matters now across every list, with up to three persistent
  Focus tasks, automatic deadline protection, and a place for everything else.
- **Lists and inbox** — capture unassigned tasks or organize them into multiple
  plans without duplicating task data. Inbox is an organization state, not a
  separate primary screen.
- **List and Kanban views** — switch between focused lists and visual boards.
- **Scheduling** — assign and reschedule due dates, with a dedicated Scheduled
  view and automatic Due Soon protection on Home.
- **Daily agenda** — open a shared daily timeline beside your workspace, drag
  tasks into time blocks, and move or resize them independently of deadlines.
  A scheduling form and mobile drawer provide the same controls without dragging.
- **Task workflows** — create, edit, move, complete, reopen, search, sort, and
  review completed tasks.
- **Responsive interface** — use the same planning workflows on desktop and
  mobile layouts.
- **End-to-end encryption** — task titles, notes, and list names are encrypted
  in the browser before being stored.

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
- [x] Home, lists, task search, sorting, and completed-task history
- [x] Due dates with automatic Home deadline protection and a Scheduled view
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
