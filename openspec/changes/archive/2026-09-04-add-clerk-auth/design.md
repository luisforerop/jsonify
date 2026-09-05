## Context

Jsonify is a Next.js 16 (App Router) app using `npm`, with no `middleware.ts`/`proxy.ts` today. "Auth" is currently a prototype: `app/session-context.tsx` holds `currentUser` in unpersisted React state, set via a manual picker (`app/login`); `app/api/users` and `app/api/workspaces` have **no server-side authorization at all** — `GET /api/workspaces` returns every workspace in the store, and the UI filters by `ownerId` client-side. The user has chosen Clerk and provided Anthropic's standard "Add Clerk Authentication" CLI-driven setup flow (`clerk init` against an already-created Clerk app, `app_3IsaUhuQIjP5k0gJGDMwu8qsnBB`) as the implementation guide. See proposal.md for the full motivation and scope.

## Goals / Non-Goals

**Goals:**
- Replace the passwordless prototype with real Clerk-backed sign-in/sign-up/sign-out and a persisted session.
- Close the current server-side authorization gap for workspace/collection management routes.
- Keep the already-shipped, API-key-based `/api/v1` public records API untouched.

**Non-Goals:**
- Organizations/multi-user workspaces (Clerk Organizations) — noted as a future exploration, not part of this change.
- Persisting active workspace/collection selection across reloads — that remains a separate UX concern, unchanged by this work.
- Migrating existing prototype `users`/`workspaces` JSON records — the prototype has no real users to preserve; a fresh start is acceptable.

## Decisions

**Use the Clerk CLI (`clerk init`) rather than hand-installing the SDK.** The provided setup guide is written around `clerk auth login` → `clerk init --app app_3IsaUhuQIjP5k0gJGDMwu8qsnBB` for an existing Next.js project. `clerk init` detects the framework/package manager, installs `@clerk/nextjs`, and scaffolds the provider, middleware, and env config in one step, which is less error-prone than manual wiring for a Next.js 16 project we haven't hand-verified against Clerk's latest SDK. Fall back to the official Next.js quickstart only if `clerk init` reports it can't fully scaffold this project.

**`ClerkProvider` inside `<body>` in `app/layout.tsx`, not wrapping `<html>`.** Per Clerk's Next.js 15+ guidance (this repo is on Next.js 16, same constraint applies) and the setup guide's critical rules.

**Middleware/proxy matcher must include `'/__clerk/:path*'` after the API/TRPC matcher.** The repo has no `middleware.ts` yet, so `clerk init` will create one; verify (rather than assume) the generated matcher includes this segment, since a missing matcher silently breaks Clerk's proxying rather than failing loudly.

**Route protection: middleware-based `auth.protect()` for pages, explicit session check for API routes.** Use Clerk's Next.js middleware helpers to gate `/workspaces` and `/w/:path*` pages. For `app/api/workspaces`, `app/api/schemas`, `app/api/collections` (non-`v1`) and `app/api/records` (non-`v1`), add an explicit `await auth()` check at the top of each handler and return 401 when there's no `userId`, rather than relying on middleware alone — these are the routes with the documented authorization gap today. `/api/v1/*` is explicitly excluded: it keeps its existing API-key + `isPublic` authorization path.

**`workspaces.ownerId` becomes the Clerk `userId` string directly; drop the local `users` table as an identity source.** `ownerId` already stores an opaque string id (previously the prototype user's local id) — swapping its meaning to a Clerk user id is a data-shape-compatible change. The local `users` JSON collection is repurposed as an optional profile cache (e.g., display name) keyed by Clerk `userId`, synced on first sign-in via Clerk webhooks or a lazy "ensure profile" call on first authenticated request — not decided as of this design; whichever is simpler to implement given the existing `lib/server/json-store.ts` (see Open Questions).

**Remove `app/login`, `UserSelector`, `UserSignupForm`, `switch-user-button`, and `SessionProvider.selectUser`.** These exist solely to work around the lack of real auth; Clerk's `SignInButton`/`SignUpButton`/`UserButton` replace them per the setup guide's Step 6. `session-context.tsx` keeps `currentWorkspace`/`currentCollection` state (unaffected) but sources `currentUser` from `useUser()`/`auth()` instead of local state.

**shadcn/ui theming (`@clerk/ui`) only if `components.json` exists.** It doesn't in this repo today, so this step is skipped unless that changes before implementation.

**Profile sync: lazy, not webhook, for now.** Given workspace/collection/permission management stays custom-built (no Clerk Organizations) and the storage layer is about to change (JSON file → real database), a webhook adds a public endpoint and a signing secret for no benefit yet. On each authenticated request, upsert the local profile record by Clerk `userId` if it's missing; that upsert function is the only piece that would later be called from a webhook handler too, so switching is additive, not a rewrite, once account updates/deletions need to propagate without a request.

**Env vars: real secrets in `.env.local` (already gitignored via `.env*`), a git-tracked `.env.example` documents which ones are required.** The current `.env*` glob also hides a bare `.env.example`, so `.gitignore` needs a `!.env.example` exception or the template silently never gets committed and the required vars stay undocumented for anyone else setting up the project.

**Auth checks are authentication-only, not per-object ownership authorization.** The check added everywhere is "is there a signed-in session," not "does this specific workspace/collection/schema/record/API key belong to this session." The one exception is `workspaces`, which is explicitly in scope: `ownerId` is now always the authenticated Clerk id, and `GET /api/workspaces` is scoped to the caller's own workspaces. Beyond that, any signed-in user can still read or mutate another user's collection/schema/record/API key by id if they know it. This matches the user's stated direction: workspace/collection permissions are being designed and built separately, later — this change only has to close the "no session required at all" hole, not build that permissions system early.

**`users` becomes an internal profile cache with no HTTP surface, not a repurposed API.** Originally the plan was to keep `app/api/users` and `hooks/use-users.ts` around, repointed at Clerk ids. Implementation found no remaining consumer for either once the passwordless login screen is gone — `session-context.tsx` gets `currentUser` directly from Clerk's `useUser()`, which already has name/email, so nothing reads the local profile cache client-side. It exists purely so a future feature (e.g. showing a teammate's name once workspace collaboration is built) has something to join against. So both the `/api/users` and `/api/users/[id]` routes and `hooks/use-users.ts` are deleted outright; a local profile row is still created/kept in sync (per the modified `users` spec), but only as a side effect of `lib/server/require-auth.ts`'s shared auth check (`ensureUserProfile`), not through any client-callable endpoint.

## Risks / Trade-offs

- **No server-side authorization exists today on workspace/collection APIs** → this change is also a security fix, not just a swap; treat the 401 checks as required, not optional polish.
- **`app/api/api-keys/**` had no auth check at all, found during implementation** → it mints/lists/deletes a workspace's API keys (which themselves gate the public `/api/v1` data API) and was grouped with the untouched public API by mistake in the original proposal/tasks. Fixed: it now requires a signed-in session like every other management route, at the same authentication-only bar described above (not per-workspace ownership — see above).
- **`clerk init` may not fully support Next.js 16 (very recent) scaffolding** → if `clerk init` reports the framework as unsupported or only partially scaffolds, fall back to `https://clerk.com/docs/nextjs/getting-started/quickstart` per the setup guide's Step 5, and verify each generated file by hand.
- **Removing local sign-up loses the existing prototype "users" data** → acceptable since the prototype has no real credentials worth preserving (see Non-Goals), but call this out to the user before deleting `data/jsonify.json` user records.
- **Profile-sync mechanism (webhook vs. lazy sync) is unresolved** → resolved: lazy sync, implemented in `lib/server/require-auth.ts` + `lib/server/user-profile.ts`.
- **Existing route-handler unit tests call `auth()`-gated handlers directly, outside any real Clerk request context** → `@clerk/nextjs/server`'s `auth()` needs Clerk's middleware/request context to resolve; `app/api/workspaces/route.test.ts`, `app/api/collections/route.test.ts`, and `app/api/api-keys/route.test.ts` now mock `@clerk/nextjs/server` to a fixed signed-in user so they keep testing the handlers' own logic rather than Clerk's.
- **Found during manual verification: client-side redirect-before-Clerk-loads caused a redirect loop** → `useRequireUser` treated Clerk's momentarily-`null` user (before `useUser().isLoaded` flips true) the same as signed-out, sending an already-authenticated visitor to `/sign-in`, which then bounced them to `/` (Clerk's own logic for an already-signed-in visitor hitting a sign-in page). `/workspaces` was unreachable by direct visit or reload. Fixed by exposing `isUserLoaded` from `session-context.tsx` and gating the redirect on it.
- **Found after the first round of manual testing: reloading a `/w/[workspaceSlug]/...` page redirected to a dead `/login` route (404)** → `app/components/collections/scoped-gate.tsx` had the same loading-vs-signed-out race as `useRequireUser` above, but was missed in that fix and still targeted the deleted `/login` route on top of it. Fixed the same way: `useScopedCollection` now reports `"loading"` (not `"no-user"`) until Clerk's `isUserLoaded` is true, and `ScopedGate` redirects to `/sign-in`.

## Migration Plan

1. Run the Clerk CLI setup (login, `clerk init --app app_3IsaUhuQIjP5k0gJGDMwu8qsnBB`) against this existing project.
2. Verify/patch the generated middleware matcher.
3. Wire `ClerkProvider` and auth controls into `app/layout.tsx`.
4. Add session checks to the non-`v1` workspace/collection/schema/record API routes.
5. Update `session-context.tsx` and `workspaces.ownerId` semantics to the Clerk `userId`.
6. Remove the prototype login screen and its components.
7. Run `clerk doctor`, start the app, and manually verify sign-up, sign-in, sign-out, and that an unauthenticated visitor is redirected/rejected from protected pages and APIs while `/api/v1` public collections still work without a session.

No production data/users exist yet, so no rollback beyond reverting the change is needed.

