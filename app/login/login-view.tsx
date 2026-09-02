"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { UserSelector } from "@/app/components/users/user-selector";
import { UserSignupForm } from "@/app/components/users/user-signup-form";
import { useSession } from "@/app/session-context";
import { useUsers, type User, type UserInput } from "@/hooks/use-users";

export function LoginView() {
  const router = useRouter();
  const { currentUser, selectUser } = useSession();
  const {
    users,
    error: usersError,
    isLoaded: usersLoaded,
    create: createUser,
  } = useUsers();

  useEffect(() => {
    if (currentUser) router.replace("/");
  }, [currentUser, router]);

  function continueAs(user: User): void {
    selectUser(user);
    router.replace("/");
  }

  async function handleCreateUser(input: UserInput): Promise<boolean> {
    const user = await createUser(input);
    if (user) {
      continueAs(user);
      return true;
    }
    return false;
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            {}
          </span>
          <span>Jsonify</span>
        </div>
      </header>

      <div className="projects-grid">
        <section className="builder-panel" aria-labelledby="login-title">
          <div className="builder-heading">
            <div>
              <p className="eyebrow">Welcome</p>
              <h1 id="login-title">Choose who you are</h1>
            </div>
          </div>
          <p className="status-copy">
            Pick an existing user to continue, or create a new one. There is no
            password check yet.
          </p>
        </section>
        <UserSelector
          users={users}
          activeUserId={currentUser?.id ?? null}
          isLoaded={usersLoaded}
          onSelectUser={continueAs}
        />
      </div>

      <div className="projects-grid">
        <UserSignupForm
          persistenceError={usersError}
          onCreate={handleCreateUser}
        />
      </div>
    </main>
  );
}
