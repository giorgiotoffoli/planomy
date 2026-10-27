# Planomy Mobile alpha execution plan

## Repository map and verified starting point

- The repository is a pnpm monorepo. The web product is a Next.js/Supabase app; `apps/mobile` is an Expo SDK 58 / React Native app using Expo Router.
- Mobile already has password and existing-account email-code sign-in through the public Supabase client, plus a transactional SecureStore session adapter. Sign-up intentionally routes through web onboarding.
- The native navigation protects Home behind an `unlocked` auth state. The locked screen currently explains that no native vault unlock exists; the native auth provider does not yet transition into the unlocked state.
- Home, task editor, reusable task/list/calendar components, Focus (maximum three), Upcoming projection, source/category filters, optimistic feedback, and an explicit memory-only preview exist. `HomeProvider` accepts a `HomeDataSource`, but no persisted vault source is mounted.
- Web task content uses the existing `e2ee:v1` AES-GCM string format. The master key is wrapped with PBKDF2-SHA-256 at 310,000 iterations and AES-GCM-256. Native code must read the existing keychain and ciphertext unchanged. Unlocked keys and decrypted task content will stay in memory and be discarded on lock/sign-out.
- Shared date, recurrence, Home projection, domain types, and database types are available through Expo aliases. Next server actions, SSR clients, and browser-only crypto are not mobile-compatible.
- The work is on the isolated branch `codex/planomy-mobile-alpha-2026-10-26`, based on the existing native auth milestone. No production configuration or data will be changed.

## Milestones

1. **Native vault boundary and crypto interoperability**
   - Implement a native-compatible adapter for the existing version-1 keychain and encrypted string protocol, preserving PBKDF2 parameters, AES-GCM tag/IV layout, and base64 representation.
   - Add deterministic protocol tests that prove a native adapter can unwrap and decrypt web-format fixtures and that corrupted/wrong-password inputs fail closed.
   - Add an explicit locked-screen unlock flow. Do not create or replace keychains on mobile, persist the master password/key, or fall back to plaintext.

2. **Live, owner-scoped task data source**
   - Read only the authenticated user's existing keychain, tasks, lists, categories, preferences, recurring occurrences, scheduled blocks, and supported upcoming events through the native Supabase client.
   - Decrypt only fields that the web protocol encrypts. Use shared models and recurrence/date/Home helpers; keep authoritative mutations in the source adapter and reconcile from Supabase after writes.
   - Support the existing Home commands with server-equivalent validation and semantics: create/edit, completion (including existing recurring occurrence behavior), Focus via the existing RPC, stash, and Home source/category preferences. Add deletion only if it fits the existing UI/data boundary without inventing new semantics.
   - Keep the preview opt-in and isolated from the authenticated live route.

3. **Native route integration and scheduling view**
   - Mount Home only after a successful keychain unlock; clear the in-memory key/source and unmount decrypted state on lock, sign-out, account change, or app background if the existing privacy contract requires it.
   - Render real scheduled blocks and existing due-date data in the Calendar/Agenda destination. Reuse shared recurrence expansion/materialization behavior only where the web semantics can be preserved safely; do not add a mobile-only recurrence format.

4. **Verification and handoff**
   - Run mobile tests, lint, TypeScript, Expo config/export or equivalent local checks, and relevant web/domain tests. Fix regressions introduced by this branch.
   - Write `OVERNIGHT_REPORT.md` with completed work, exact checks/results, incomplete work, device/manual checks, security notes, and three next steps.
   - No live sign-in or cross-device sync claim will be made unless runtime credentials and a device/simulator are available and those flows are exercised.

## Constraints and stop conditions

- No database migration, deployment, production data mutation, credential change, weaker encryption, plaintext task persistence, or mobile-only wire format.
- Use only public Expo Supabase configuration. If it is absent, keep that as a test/runtime limitation rather than adding credentials or claiming live authentication.
- If native crypto support or the current backend schema cannot be verified, stop that part and document the exact blocker while continuing independent source, UI, and static validation work.
