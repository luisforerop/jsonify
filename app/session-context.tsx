"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Collection } from "@/hooks/use-collections";
import type { User } from "@/hooks/use-users";
import type { Workspace } from "@/hooks/use-workspaces";

type SessionValue = {
  currentUser: User | null;
  currentWorkspace: Workspace | null;
  currentCollection: Collection | null;
  selectUser: (user: User | null) => void;
  selectWorkspace: (workspace: Workspace | null) => void;
  selectCollection: (collection: Collection | null) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Holds who/what is active for this browser tab. Per the prototype design none
 * of this is persisted: a reload drops the active user, workspace, and
 * collection, and the always-visible selectors prompt again.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null,
  );
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(
    null,
  );

  const selectUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    setCurrentWorkspace(null);
    setCurrentCollection(null);
  }, []);

  const selectWorkspace = useCallback((workspace: Workspace | null) => {
    setCurrentWorkspace(workspace);
    setCurrentCollection(null);
  }, []);

  const selectCollection = useCallback((collection: Collection | null) => {
    setCurrentCollection(collection);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      currentWorkspace,
      currentCollection,
      selectUser,
      selectWorkspace,
      selectCollection,
    }),
    [
      currentUser,
      currentWorkspace,
      currentCollection,
      selectUser,
      selectWorkspace,
      selectCollection,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
