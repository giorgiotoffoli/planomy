<p align="center">
  <img src="src/app/readme-banner.png" alt="Planomy header">
</p>

> [!WARNING]  
> Planomy is currently in **beta**.  
> Features may change, bugs may occur, and breaking updates are possible.
>
> While stability is improving, you should **avoid storing critical data** for now.

**Planomy** is an open-source task manager designed to make planning feel simple, fast, and distraction-free—without compromising your privacy.

Built with a focus on clarity and usability, Planomy helps you organize your tasks, stay on top of your schedule, and actually enjoy the process of getting things done.

## 🔐 Encrytption in v1

### 1. E2EE Promise

Planomy will encrypt private planner data before it leaves the user's device.

The server may store and sync encrypted data, but it should not be able to read task titles, notes, list names, project names, or planning details.

Plaintext should only exist in the user's browser while the vault is unlocked.

### 2. What We Are Protecting

Encrypted in v1:

- Task title
- Task notes/description
- Task due date
- Task scheduled date
- Task priority
- Task completed status
- List name
- Project name
- Board/column names

Not encrypted in v1:

- User ID
- Item ID
- Item type
- Created timestamp
- Updated timestamp
- Deleted timestamp
- Encryption version
- Key version

## 3. Data Model Direction

Instead of storing task fields directly in Supabase, Planomy will store encrypted blobs.

Example encrypted row:

```txt
encrypted_items
- id
- user_id
- item_type
- ciphertext
- iv
- encryption_version
- key_version
- created_at
- updated_at
- deleted_at

## ✨ Features

- 🧠 **Focused task management** — no clutter, just what matters
- 🗂️ **Multiple lists** — organize tasks your way
- 🔁 **Move tasks between lists** — flexible workflows
- 🔢 **Live task counters** — beautiful, real-time updates (NumberFlow)
- ✅ **Completed view** — review everything you’ve finished
- 📅 **Scheduling** — plan ahead with ease
- 🔒 **Privacy-first** — no trackers, no data selling, ever
- 🧩 **Open-source** — fully transparent and customizable


## 🛠️ Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **UI:** TailwindCSS, shadcn/ui
- **Backend & DB:** Supabase (PostgreSQL)
- **Deployment:** Vercel


## 💡 Philosophy

Planomy is built on a few simple ideas:

- Software should feel **fast and intuitive**
- Productivity tools should reduce stress, not add to it
- Your data should belong to **you**, not be tracked or sold


## 🤝 Contributing

Contributions, feedback, and ideas are always welcome.

If you’d like to help:
- Open an issue
- Suggest a feature
- Submit a pull request


## 📌 Roadmap

- [ ] 🔒 E2EE
- [x] 😊 Optimistic UI
- [X] 🎯 Kanban Boards
- [ ] 🤝 Collaboration features
- [ ] 📱 Mobile app
- [ ] ⚡ Performance improvements
- [ ] 🧠 Smarter task organization


## 🌐 Try it out

👉 https://www.planomy.com
```
