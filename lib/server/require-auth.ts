import { auth, currentUser } from "@clerk/nextjs/server";

import { ensureUserProfile } from "@/lib/server/user-profile";

/**
 * Resolves the signed-in Clerk user id for the current request, or `null` if
 * there isn't one. As a side effect, keeps the local profile cache (kept for
 * future workspace/collaboration features) in sync on that user's first
 * request.
 */
export async function requireUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    await ensureUserProfile(userId, async () => {
      const user = await currentUser();
      return {
        name: user?.fullName ?? user?.username ?? "",
        email: user?.primaryEmailAddress?.emailAddress ?? "",
      };
    });
  } catch {
    // The profile cache is a convenience for future features, not a source
    // of truth for identity — a write failure here must not block the
    // authenticated request itself.
  }

  return userId;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
