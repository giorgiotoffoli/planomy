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

Phase 1 now provides a native Supabase Auth session using `@supabase/supabase-js`, only the public Expo URL/publishable-key variables, and an Expo SecureStore adapter backed by Keychain/Keystore. Refresh runs while the app is active and persisted sessions restore on cold launch. The Expo Router protects the Home tabs behind the separate `unlocked` state; a signed-in user lands on the explicit locked screen, and `HomeProvider` is mounted only after a future vault unlock.

There is still no compatible native E2EE unlock implementation. The web vault uses browser Web Crypto, AES-GCM encrypted strings and PBKDF2-wrapped master keys. Its Next.js server actions and cookie client cannot be imported into React Native.

The Home model still has an explicit in-memory preview for UI development. It does not read or mutate Supabase, use credentials or keys, or write plaintext tasks to disk. Leaving preview discards its snapshot. The preview is behind the unlocked route guard and is not reachable through normal Phase 1 navigation. Preview mutations exercise UI behavior; they are not a production persistence implementation. Recurring preview completion is limited to today's materialized occurrence; future recurring entries cannot materialize backend sessions.

`HomeDataSource` in `features/home/model.ts` defines the integration contract: an unlocked data source supplies a decrypted in-memory snapshot, performs authoritative mutations and returns the reconciled snapshot. It must perform recurrence materialization and event exception expansion in the data layer. `HomeProvider` serializes mutations and rolls back optimistic changes on failure. The vault owner must mount it only after unlock, keep the source stable and unmount it on lock/sign-out/account change to discard all decrypted state. Offline reads/writes and real-time subscriptions await that integration; the UI retains the last session snapshot when refresh fails.

## Validation

- Phase 1 mobile TypeScript and ESLint pass; 22 mobile tests and 95 web tests pass. Web ESLint completes with existing warnings.
- Expo app config, iOS JavaScript/Hermes export, web export, and iOS prebuild pass.
- Expo Doctor completed 18/20 checks; its config schema and React Native Directory checks could not reach Expo's online services in this environment.
- This Phase 1 run has no installed iOS Simulator runtime/device and no `apps/mobile/.env.local`, so sign-in, cold-launch restore, and sign-out were not exercised interactively. Earlier Home UI simulator findings below are from the foundation validation run.
- Earlier foundation validation inspected Home launch, preview, completion, Undo, task creation, partial category Sources behavior, stashing/unstashing, and light/dark appearance on an iOS simulator. The installed runtime rejected standard iPhone 17 Pro and 18 Pro simulator creation as incompatible.

Standard iPhone size checks, full Dynamic Type/VoiceOver traversal, reduced transparency/motion toggles, and older-iOS fallback still need a compatible simulator/device pass. No production backend mutation or native vault unlock test has been performed.

## Next step

Design and security-review the native vault adapter with compatibility tests for the existing wrapping and encrypted-string formats. Supply its decrypted in-memory source to `HomeProvider` only after successful unlock, reuse the existing backend focus and source RPCs, and verify recurrence completion and sync across web/iOS. Do not save decrypted snapshots, master passwords, or unlocked keys in general-purpose persistent storage.
