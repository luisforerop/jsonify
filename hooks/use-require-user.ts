"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession, type SessionUser } from "@/app/session-context";

/**
 * Guards a page that needs a signed-in user. Waits for Clerk to finish
 * loading before deciding: redirecting on a still-loading session would send
 * an already signed-in visitor to `/sign-in`, which then bounces them again
 * (Clerk's sign-in page redirects an authenticated visitor away). Returns the
 * active user, or `null` while loading or redirecting.
 */
export function useRequireUser(): SessionUser | null {
  const { currentUser, isUserLoaded } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoaded && !currentUser) router.replace("/sign-in");
  }, [isUserLoaded, currentUser, router]);

  return currentUser;
}
