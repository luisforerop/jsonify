import { repositories } from "@/lib/server/repositories";

type ProfileFields = { name: string; email: string };

/**
 * Creates the local profile cache row for a Clerk user on their first
 * authenticated request; an existing row skips calling Clerk again.
 */
export async function ensureUserProfile(
  userId: string,
  getProfile: () => Promise<ProfileFields>,
): Promise<void> {
  const existing = await repositories.users.findById(userId);
  if (existing) return;
  const profile = await getProfile();
  await repositories.users.upsert(userId, profile);
}
