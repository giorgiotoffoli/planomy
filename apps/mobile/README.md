# Planomy Mobile

The iOS foundation for Planomy lives here as an independent Expo workspace.
It contains native Home and Calendar destinations with Expo Router
native tabs. Home now includes Focus, Upcoming, tasks, task editing and Sources;
see `../../docs/mobile-home.md` for the current integration boundary. Home’s native header toolbar opens a task sheet; task creation is not a tab. The tab bar uses Apple's
system rendering, including the Liquid Glass appearance on supported iOS
versions; feedback uses `expo-glass-effect` only when the runtime
and accessibility settings allow it.

## Run on an iOS Simulator

From the repository root:

```sh
pnpm install
pnpm mobile:ios
```

The first run generates the ignored `apps/mobile/ios` project with Expo
Prebuild, builds it with Xcode, and opens the selected iOS Simulator. This is a
local development build and does not require a paid Apple Developer account.

For the Metro server without rebuilding native code:

```sh
pnpm mobile
```

Then press `i` in the Expo CLI, or run `pnpm mobile:ios` when the native project
needs to be rebuilt. Xcode and an installed iOS Simulator runtime are required.

## Checks

```sh
pnpm mobile:typecheck
pnpm mobile:lint
pnpm mobile:doctor
pnpm --dir apps/mobile test
```

Native Liquid Glass appearance cannot be confirmed by TypeScript or static
configuration checks. Verify it on an iOS 26+ simulator or device after
building the app. Older iOS versions use the native tab bar's supported
fallback behavior.

## Environment and shared code

Mobile-only public configuration belongs in `apps/mobile/.env.local` using the
keys in `.env.example`. Only the Supabase URL and publishable key may be
exposed to this bundle; never add `SUPABASE_SECRET_KEY` or another server-only
credential here.

The foundation intentionally does not import the web app's server actions,
middleware, `@supabase/ssr` clients, or browser E2EE module. Future mobile data
work should use a native Supabase client with mobile session persistence and a
reviewed secure key-storage boundary. `src/lib/crypto/e2ee.ts` currently relies
on Web Crypto plus browser `btoa`/`atob`, so it must not be reused in the native
bundle until a compatible implementation is designed and security-reviewed.
Home directly reuses audited pure domain types and helpers through mobile aliases; database schemas, authentication
behavior, and encryption guarantees remain unchanged by this foundation.

## Reusable component system

The public component barrel is `components/index.ts`. Design primitives live in
`components/ui/primitives.tsx`; typed colors, list identity colors, spacing,
radii, icon sizes, and type styles live in `features/home/theme.ts`. Task, date
and scheduling, list/category, calendar, and widget building blocks are grouped
under `components/tasks`, `components/scheduling`, `components/lists`,
`components/calendar`, and `components/widgets` respectively.

Home composes the reusable Focus and Upcoming widgets, task rows, and a compact
seven-day calendar preview. The preview distinguishes task deadlines from
calendar events and is based on the shared Home Upcoming projection. Planned
session blocks are separate components; the current `HomeSnapshot` does not
yet supply scheduled sessions. Task, list, category, recurrence, and date
business rules continue to come from shared Planomy types and pure helpers.
Platform-specific symbol fallbacks and the limited Liquid Glass surface are
kept inside shared components so the screen composition remains Android-safe.
