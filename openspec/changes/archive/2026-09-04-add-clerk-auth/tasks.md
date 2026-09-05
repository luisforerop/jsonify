## 1. Clerk CLI setup

- [x] 1.1 Check for the Clerk CLI (`command -v clerk && clerk --version`); install or `clerk update --yes` it via npm if missing/outdated
- [x] 1.2 Run `clerk auth login` and wait for the user to complete sign-in
- [x] 1.3 Run `clerk init --app app_3IsaUhuQIjP5k0gJGDMwu8qsnBB` from the project root (existing Next.js project — do not pass `--framework`/`--pm`)
- [x] 1.4 If `clerk init` reports Next.js 16 as unsupported or only partially scaffolds, follow https://clerk.com/docs/nextjs/getting-started/quickstart by hand for the remaining steps and note any deviation from this task list (not needed — `clerk init` fully supported Next.js 16 app-router)
- [x] 1.5 Confirm required env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) are present in `.env.local` without reading or printing the resulting env file contents
- [x] 1.6 Add `!.env.example` to `.gitignore` (the existing `.env*` rule currently hides it too) and create a git-tracked `.env.example` listing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` with empty/placeholder values only — no real keys

## 2. Provider, middleware, and matcher

- [x] 2.1 Verify `ClerkProvider` was added inside `<body>` in `app/layout.tsx` (not wrapping `<html>`); fix if `clerk init` placed it wrong
- [x] 2.2 Verify the generated `middleware.ts` matcher includes `'/__clerk/:path*'` immediately after `'/(api|trpc)(.*)'`; add it if missing (not applicable — `clerk init` did not scaffold the Frontend API proxy route, and Clerk's own setup/nextjs-patterns skills don't require this matcher entry without it; also confirmed `proxy.ts` uses Next.js 16's `proxy` convention correctly)
- [x] 2.3 Configure Clerk middleware (`clerkMiddleware`/`auth.protect()`) to require a session for `/workspaces` and `/w/:path*` pages, redirecting unauthenticated visitors to sign-in

## 3. Auth UI

- [x] 3.1 Add `SignInButton`, `SignUpButton`, and `UserButton` (via `Show`/`signed-in`/`signed-out`) to the top-level layout or nav, replacing the current entry point to `app/login` (added to `/` in `home-dashboard.tsx`, which is now a mixed signed-out/signed-in landing rather than a hard-gated page — only `/workspaces` and `/w/*` are gated, per the `clerk-authentication` spec; `workspaces-view.tsx` got `UserButton` in place of `SwitchUserButton`)
- [x] 3.2 Remove `app/login/page.tsx`, `app/login/login-view.tsx`, `app/components/users/user-selector.tsx`, `app/components/users/user-signup-form.tsx`, and `app/components/users/switch-user-button.tsx`
- [x] 3.3 Update `app/session-context.tsx` to source `currentUser` from Clerk's `useUser()` instead of local `selectUser` state; drop `selectUser` from the context value and its call sites

## 4. Server-side authorization

- [x] 4.1 Add an `await auth()` check (return 401 with no body/action if `userId` is missing) to `app/api/workspaces/route.ts` (GET and POST) and its `[id]` route (implemented as a single guard inside `lib/server/collection-handlers.ts`'s shared `listResponse`/`createSluggedResponse`/`updateResponse`/`deleteResponse`, rather than duplicated per route file, since every non-public route already goes through those helpers)
- [x] 4.2 Add the same check to `app/api/collections/route.ts` and `[id]`, and `app/api/schemas/route.ts` and `[id]` (non-`v1` collection/schema management) — covered by the same shared guard, no route file changes needed
- [x] 4.3 Add the same check to `app/api/records/route.ts` and `[id]` (non-`v1` record management) — covered by the same shared guard, no route file changes needed
- [x] 4.4 **Correction found during implementation**: `app/api/api-keys/**` (minting/listing/deleting a workspace's API keys) had **no auth check at all**, unlike what this task originally assumed — it's a private management endpoint, not part of the public API-key-authorized surface. Added `requireUserId()`/401 to `GET`/`POST` in `app/api/api-keys/route.ts` (its `DELETE` already goes through the shared guard via `deleteResponse`). `app/api/v1/**` (the actual public, API-key-authorized records API) is confirmed untouched.
- [x] 4.5 Scope `GET /api/workspaces` to the authenticated `userId` server-side (filter by `ownerId`) instead of returning every workspace for client-side filtering (`listResponse`/`createSluggedResponse` gained an `ownerField` option for this)

## 5. Identity model

- [x] 5.1 Update workspace creation (`createSluggedResponse` call site or the handler itself) to set `ownerId` from the authenticated Clerk `userId` rather than a client-supplied value (via `createSluggedResponse`'s new `ownerField` option); `hooks/use-workspaces.ts`'s `WorkspaceInput` no longer takes `ownerId` from the client at all
- [x] 5.2 Repurpose the local `users` collection as a profile cache keyed by Clerk `userId` (**changed from the original plan**: `app/api/users` and `hooks/use-users.ts` are deleted outright rather than repointed — nothing consumed them once the login screen was gone, since `session-context.tsx` now reads name/email straight from Clerk. `lib/server/require-auth.ts` + `lib/server/user-profile.ts` lazily create/update the local profile row as a side effect of the shared auth check, with no client-callable endpoint)
- [x] 5.3 Update `lib/server/validation.ts` (`isUserInput`, `isWorkspaceInput`) and any other validators that assumed the old prototype user shape (`isUserInput`/`UserInput` removed; `isWorkspaceInput` unchanged since `ownerId` is now injected server-side before validation)
- [x] 5.4 **Added during implementation**: `@clerk/nextjs/server`'s `auth()` can't resolve outside a real Next.js/Clerk request context, which broke the existing unit tests that call route handlers directly (`app/api/workspaces/route.test.ts`, `app/api/collections/route.test.ts`, `app/api/api-keys/route.test.ts`). Mocked `@clerk/nextjs/server` in each and added cases for the new 401/ownership behavior; `hooks/use-workspaces.test.tsx` updated for the dropped client-side `ownerId`.

## 6. Verification

- [x] 6.1 Run `clerk doctor` and resolve any reported issues (clean — only non-issues: production instance not yet configured, shell completion not installed)
- [x] 6.2 Start the app; sign up as a first test user via the nav and confirm the profile icon appears (done via browser automation with a `+clerk_test` dev-mode email — signed up, `UserButton` appeared, `data/jsonify.json` got a profile row keyed by the real Clerk user id)
- [x] 6.3 Manually verify: signed-out visitor hitting `/workspaces` or `/w/<slug>` is redirected to sign-in; signed-out request to a protected API route gets 401 (confirmed via curl and browser — both redirect/401 correctly)
- [x] 6.4 Manually verify: signed-in user can create a workspace, see only their own workspaces, and reload without losing their session — **found and fixed a real bug**: `useRequireUser` redirected to `/sign-in` as soon as `currentUser` was `null`, which is also true for the first render tick before Clerk finishes loading the client session. That sent an *already signed-in* visitor to `/sign-in`, which then bounced them to `/` (Clerk's own already-authenticated redirect), so `/workspaces` never rendered on a direct visit/reload. Fixed by adding `isUserLoaded` to `session-context.tsx` (from Clerk's `useUser().isLoaded`) and only redirecting once loading has finished. Reverified: direct visit to `/workspaces` while signed in now stays put and lists only that user's workspace.
- [x] 6.5 Manually verify the public `/api/v1` records API still works without a Clerk session for a public collection, and API-key-protected calls are unaffected (confirmed via curl: public collection returns data with no auth at all; non-public collection still returns its own `{"error":"Missing API key"}` 401, unrelated to Clerk)
- [x] 6.6 Update `README.md` if any documented setup or API behavior changed (e.g., new required env vars, changed `/api/workspaces` response scope) — added an "Authentication" section covering `.env.example`/Clerk keys and which routes now require a session
- [x] 6.7 **Found after this session's first verification pass**: reloading a `/w/[workspaceSlug]/...` page bounced to `/login`, a route deleted by this change (404). `app/components/collections/scoped-gate.tsx` had the same "treat momentarily-null user as signed-out" race as the `useRequireUser` bug in 6.4, plus it still targeted the old `/login` path. Fixed `hooks/use-scoped-collection.ts` to report `"loading"` until `isUserLoaded`, and `scoped-gate.tsx` to redirect to `/sign-in`. Reverified: sign in, load `/w/<slug>`, reload directly — stays put, no dead-route bounce.
