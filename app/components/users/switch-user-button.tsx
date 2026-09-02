"use client";

import { useRouter } from "next/navigation";

import { useSession } from "@/app/session-context";

/**
 * Clears the active user (and its workspace/collection) before sending the
 * person to `/login`. Without clearing first, `/login` would bounce straight
 * back to `/` because a user would still be active.
 */
export function SwitchUserButton() {
  const router = useRouter();
  const { selectUser } = useSession();

  function switchUser(): void {
    selectUser(null);
    router.push("/login");
  }

  return (
    <button
      className="button button-secondary"
      type="button"
      onClick={switchUser}
    >
      Switch user
    </button>
  );
}
