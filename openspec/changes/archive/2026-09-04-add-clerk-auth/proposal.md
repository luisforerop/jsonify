## Why

Jsonify's current "auth" is a prototype: anyone can create a user from a name/email/password form with no password check, and the active user lives only in unpersisted React state — a reload drops it and forces the picker again. This was enough to exercise the User → Workspace → Collection hierarchy end to end, but it blocks real usage: there is no real identity, no session security, and no protection on any route or API. Clerk provides hosted sign-in/sign-up, session management, and route protection with minimal custom code, and the user has chosen it as the auth provider — this is the right time to replace the placeholder before more tenant-scoped features are built on top of it.

## What Changes

- Install and configure Clerk (`@clerk/nextjs`) via the Clerk CLI (`clerk init`), including middleware/proxy setup for Next.js 16.
- Wrap the app in `ClerkProvider` and add real sign-in, sign-up, and signed-in user controls (`SignInButton`, `SignUpButton`, `UserButton`) to the top-level layout, replacing the ad-hoc `/login` picker screen.
- **BREAKING**: Remove the passwordless user-selector login flow (`app/login`, `UserSelector`, `UserSignupForm`, `switch-user-button`) and the `SessionProvider`'s manual `selectUser`; the active user is now derived from the Clerk session, not chosen from a list.
- **BREAKING**: Replace the local `users` JSON-store records (name/email/plaintext-or-hashed-password) as the source of identity — the Clerk user id becomes the canonical user identifier. Existing `app/api/users` create/list endpoints and the `users` hook are removed or repurposed as a thin profile cache keyed by Clerk user id, not as the identity store.
- Protect app routes and API routes that currently assume an "active user" (workspace creation/listing, collection management) so they require a signed-in Clerk session; unauthenticated requests are redirected to sign-in (pages) or rejected (APIs), except the already-public `/api/v1` collection endpoints which keep their existing API-key-based authorization untouched.
- Update `workspaces.ownerId` to reference the Clerk user id, and require a signed-in Clerk session (instead of a manually-selected prototype user) to create or list workspaces. Active workspace/collection selection stays a manual, non-persisted choice, unchanged from today.
- Add required Clerk environment configuration (publishable/secret keys) without printing or reading existing env files.

## Capabilities

### New Capabilities
- `clerk-authentication`: Sign-in, sign-up, sign-out, session persistence, and route/API protection backed by Clerk, replacing the prototype's passwordless login.

### Modified Capabilities
- `users`: Identity is no longer a passwordless, locally-created record selected from a list — it is backed by a real Clerk account, and the active user comes from the Clerk session rather than manual, unpersisted selection.
- `workspaces`: `ownerId` now references the Clerk user id instead of the prototype user id, and creating or listing workspaces now requires a signed-in Clerk session instead of a manually-selected prototype user.

## Impact

- **Dependencies**: adds `@clerk/nextjs` (and `@clerk/ui` if shadcn theming is wired in); requires the Clerk CLI for setup.
- **Config**: new `middleware.ts` (or updated proxy matcher) at the project root; new required env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
- **Removed/replaced code**: `app/login/*`, `app/components/users/user-selector.tsx`, `app/components/users/user-signup-form.tsx`, `app/components/users/switch-user-button.tsx`, the manual `selectUser` path in `app/session-context.tsx`.
- **Changed code**: `app/session-context.tsx` (user now sourced from Clerk), `app/layout.tsx` (add `ClerkProvider`, auth controls), `app/api/users/*`, `hooks/use-users.ts`, `lib/server` workspace/collection handlers that check for an "active user" (`ownerId` semantics), and any route currently reachable without a session.
- **Untouched**: the public `/api/v1` records API, which is already authorized separately via API keys and `isPublic` collections.
