<p align="center">
  <img src="src/app/readme-banner.png" alt="Planomy header">
</p>

> [!WARNING]  
> Planomy is currently in **beta**.  
> Features may change, bugs may occur, and breaking updates are possible.
> You have been warned!

**Planomy** is an open-source, end-to-end encrypted task manager designed to make planning feel simple, fast, and distraction-free without compromising your privacy.

Built with a focus on clarity and usability, Planomy helps you organize your tasks, stay on top of your schedule, and actually enjoy the process of getting things done.

## 🔐 Encrytption in v1

### 1. E2EE Promise

Planomy will encrypt private planner data before it leaves the user's device.

The server may store and sync encrypted data, but it should not be able to read task titles, notes, or list names.

Plaintext should only exist in the user's browser while the vault is unlocked.

### 2. What We Are Protecting

Encrypted in v1:

- Task title
- Task notes/description
- List name

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

- [X] 🔒 E2EE
- [X] 😊 Optimistic UI
- [x] 🎯 Kanban Boards
- [ ] 🤝 Collaboration features
- [ ] 📱 Mobile app
- [ ] ⚡ Performance improvements
- [ ] 🧠 Smarter task organization
