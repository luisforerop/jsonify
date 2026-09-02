"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/app/session-context";
import type { User } from "@/hooks/use-users";

/**
 * Guards a page that needs an active user. Because the active user is not
 * persisted, a direct visit or a reload lands here with no user — send those
 * back to `/login`. Returns the active user, or `null` while redirecting.
 */
export function useRequireUser(): User | null {
  const { currentUser } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) router.replace("/login");
  }, [currentUser, router]);

  return currentUser;
}
