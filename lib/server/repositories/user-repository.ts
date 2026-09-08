import type { User, UserProfileInput } from "@/lib/server/repositories/types";

/**
 * The local profile cache for a Clerk user. Identity itself lives in Clerk; this
 * row is created/updated on the user's first authenticated request.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  upsert(id: string, profile: UserProfileInput): Promise<User>;
}
