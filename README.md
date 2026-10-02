<p align="center">
  <img src="src/app/readme-banner.png" alt="Planomy">
</p>

# Planomy

Planomy is an open-source, end-to-end encrypted task manager for organizing
work without giving up privacy. It combines focused daily planning, flexible
lists, scheduling, and board views in a responsive web application.

> [!WARNING]
> Planomy is in beta. Features and data models may change between releases.

## Features

- **My Day** — choose tasks from any list, carry unfinished work forward
  intentionally, and pin up to three daily focus tasks.
- **Lists and inbox** — capture unassigned tasks or organize them into multiple
  plans without duplicating task data.
- **List and Kanban views** — switch between focused lists and visual boards.
- **Scheduling** — assign and reschedule due dates, with dedicated Today and
  Scheduled views.
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
is unlocked. My Day stores references to existing tasks rather than copies of
their content.

## Technology

- Next.js, React, and TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth and PostgreSQL
- Web Crypto-based end-to-end encryption

## Roadmap

### Available now

- [x] End-to-end encrypted task and list content
- [x] Inbox, lists, task search, sorting, and completed-task history
- [x] Due dates with Today and Scheduled views
- [x] List and Kanban board layouts
- [x] My Day selection, suggestions, daily focus, and rollover
- [x] Optimistic task updates and responsive navigation

### Planned

- [ ] Shared plans and collaboration
- [ ] Native mobile applications
- [ ] Offline-first synchronization
- [ ] Accessibility and performance improvements

## Contributing

For daily agenda database setup and verification, see
[supabase/README.md](supabase/README.md). Apply its migration to your existing
Supabase project before using time blocks.

Issues and pull requests are welcome. Please keep changes focused, preserve the
project's encryption boundaries, and include relevant verification with each
contribution.
