# Native Home milestone

## Implemented

`apps/mobile/app/(tabs)/home` now hosts the native Home screen, within the existing Expo Router native tabs and stack. The root route redirects to Home. Calendar remains the existing foundation destination.

Home provides Focus (up to three tasks), Upcoming (Overdue, Today, Coming up this week), an incomplete task feed and a collapsible Stashed area. Task rows expose completion, details and a native action sheet for Focus and stash actions. The native header toolbar owns Add Task and privacy information, avoiding assumptions about where the system positions its tab bar.

Task creation and editing use native modal navigation, multiline title/notes, list/category selection and system date/time pickers. Sources is a separate modal with list/category switches and partial selection labels. Native navigation supplies Liquid Glass on supported systems. Ordinary rows stay opaque. Feedback uses a small availability-checked glass surface with a readable fallback, completion Undo, haptics and reduced-motion-aware layout changes. Text scales with the system; controls have at least 44-point targets and accessibility labels/actions.

## Shared rules

- `src/lib/home.ts`: Focus limit, mutually exclusive buckets, list/category/Unsorted visibility, partial source state, due labels.
- `src/lib/home-upcoming.ts`: extracted directly from the web Home component and used by both platforms. Preserves the exclusive seven-calendar-day window, overdue labels, recurrence selection, time-zone-aware event dates, ongoing events, event visibility and the nearest occurrence of each event series.
- `src/lib/today.ts` and `src/lib/recurrence.ts`: local calendar arithmetic and next occurrence calculations.
- Existing domain types in `src/types.ts`. Mobile uses aliases to these audited pure modules; no Next server action, browser vault, SSR client or web UI enters the native bundle.

The only web Home change delegates the existing Upcoming projection to the shared function. Its rendering and other behavior remain unchanged. Root `tsconfig.json` no longer extends an unavailable Expo config; mobile keeps its own Expo config. Expo-required Router/symbol peers are declared directly, the obsolete `newArchEnabled` flag is removed for SDK 58, and the doctor script explicitly runs Expo Doctor rather than pnpm’s built-in doctor.

## Live data is blocked

The Expo foundation has no authenticated mobile session, secure token storage or compatible E2EE unlock implementation. The web vault uses browser Web Crypto, AES-GCM encrypted strings and PBKDF2-wrapped master keys. Its Next.js server actions and cookie client cannot be imported into React Native.

The app therefore defaults to an explicit connection state. Release builds do not expose sample mode. Development builds provide **Explore sample Home**, clearly labeled with memory-only changes. This preview does not read or mutate Supabase, use credentials or keys, or write plaintext tasks to disk. Leaving preview discards its snapshot. Preview mutations exercise UI behavior; they are not a production persistence implementation. Recurring preview completion is limited to today's materialized occurrence; future recurring entries cannot materialize backend sessions.

`HomeDataSource` in `features/home/model.ts` defines the integration contract: an unlocked data source supplies a decrypted in-memory snapshot, performs authoritative mutations and returns the reconciled snapshot. It must perform recurrence materialization and event exception expansion in the data layer. `HomeProvider` serializes mutations and rolls back optimistic changes on failure. The vault owner must mount it only after unlock, keep the source stable and unmount it on lock/sign-out/account change to discard all decrypted state. Offline reads/writes and real-time subscriptions await that integration; the UI retains the last session snapshot when refresh fails.

## Validation

- Mobile TypeScript and ESLint; Expo Doctor: 20/20 checks passed.
- Web TypeScript and changed-file ESLint.
- Six native domain tests and 95 web tests, including five shared Upcoming regressions.
- Production iOS JavaScript/Hermes export.
- Xcode Debug simulator build: succeeded, no errors. Expo emits an existing CoreModule visibility warning.
- iOS 27.1 iPhone Duo: Home launch, preview, completion, Undo, task creation partial category Sources behavior, stashing/unstashing and light/dark appearance inspected interactively.

The installed runtime rejects standard iPhone 17 Pro and 18 Pro simulator creation as incompatible. Standard iPhone size checks, full Dynamic Type/VoiceOver traversal, reduced transparency/motion toggles, older-iOS fallback still need a compatible simulator/device pass. No production backend mutation or fresh-account sign-in/unlock test has been performed.

## Next step

Implement and review a native Supabase authentication/session and vault adapter, with protocol compatibility tests for the existing wrapping and encrypted-string formats and native secure storage for session material. Supply it to HomeProvider, reuse the existing backend focus RPC and source RPCs, and verify recurrence completion and sync across web/iOS. Do not save decrypted snapshots, master passwords or unlocked keys in general-purpose persistent storage.
