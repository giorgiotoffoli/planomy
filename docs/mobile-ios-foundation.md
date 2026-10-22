# Planomy iOS foundation

The native companion is isolated at `apps/mobile`. The existing Next.js app
remains the repository root package and keeps its current authentication,
Supabase, and encryption boundaries.

## Current architecture

- Expo SDK 58 with React Native 0.88 and TypeScript.
- Expo Router's stable `expo-router/native-tabs` implementation.
- Two tab destinations: Home and Calendar.
- A separate floating Add Task action sits above the tab bar and is not part of
  the main navigation.
- Native stack layouts inside each tab for iOS large-title navigation.
- `expo-glass-effect` behind runtime and `reduceTransparency` checks for one
  restrained placeholder surface.
- Generated native projects are ignored so local prebuild output does not
  become a second hand-maintained iOS application in this foundation branch.

## Shared-code boundary

The current web Supabase client uses `@supabase/ssr` and Next.js environment
variables. The server client, admin client, middleware, and server actions are
not mobile-compatible and must stay out of the native bundle. A future mobile
client should use `@supabase/supabase-js` with only the public URL and
publishable key, plus an explicitly chosen mobile session-storage strategy.

The existing `src/lib/crypto/e2ee.ts` uses Web Crypto and browser base64 APIs.
It is valuable as a protocol reference, but it is not imported by the mobile
app. A native implementation must preserve the existing wire format and key
handling guarantees, use platform-appropriate secure storage, and receive a
separate security review before any sync or authentication work is added.

Pure TypeScript domain types and platform-neutral business logic can be
considered for a future shared package after checking their imports. This
branch deliberately does not move or duplicate those modules.

## Liquid Glass support

The native tab bar is the primary Liquid Glass integration. On iOS 26 and
later, the system renders the tab bar using the platform's Liquid Glass design;
the app does not replace it with a web-style blur. Additional glass is limited
to the placeholder card and falls back to a normal readable surface on older
iOS versions, unsupported runtimes, or when Reduce Transparency is enabled.

Static checks cannot prove the visual effect. Use `pnpm mobile:ios` and inspect
the built app on a supported simulator or device for visual verification.
