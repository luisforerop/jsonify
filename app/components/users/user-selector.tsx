"use client";

import type { User } from "@/hooks/use-users";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";

type UserSelectorProps = {
  users: User[];
  activeUserId: string | null;
  isLoaded: boolean;
  onSelectUser: (user: User) => void;
};

export function UserSelector({
  users,
  activeUserId,
  isLoaded,
  onSelectUser,
}: UserSelectorProps) {
  return (
    <aside className="saved-panel" aria-label="Users">
      <PanelHeading
        eyebrow="Active user"
        title="Choose a user"
        badge={String(users.length)}
      />
      {!isLoaded && <p className="status-copy">Loading users...</p>}
      {isLoaded && users.length === 0 && (
        <p className="status-copy">
          No users yet. Create one to get started.
        </p>
      )}
      <ul className="saved-list">
        {users.map((user) => (
          <li
            className={
              user.id === activeUserId ? "saved-item is-active" : "saved-item"
            }
            key={user.id}
          >
            <button
              className="saved-schema-button"
              type="button"
              onClick={() => onSelectUser(user)}
            >
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
