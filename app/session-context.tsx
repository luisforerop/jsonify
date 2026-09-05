"use client";

import { useUser } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Collection } from "@/hooks/use-collections";
import type { Workspace } from "@/hooks/use-workspaces";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

type SessionValue = {
  currentUser: SessionUser | null;
  isUserLoaded: boolean;
  currentWorkspace: Workspace | null;
  currentCollection: Collection | null;
  selectWorkspace: (workspace: Workspace | null) => void;
  selectCollection: (collection: Collection | null) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Holds who/what is active for this browser tab. `currentUser` mirrors the
 * signed-in Clerk session (`null` while signed out or before Clerk has
 * loaded). `currentWorkspace`/`currentCollection` are not persisted: a reload
 * drops them and the relevant pages prompt again.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null,
  );
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(
    null,
  );

  const currentUser: SessionUser | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.fullName ?? user.username ?? "Unnamed",
      email: user.primaryEmailAddress?.emailAddress ?? "",
    };
  }, [user]);

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
      isUserLoaded,
      currentWorkspace,
      currentCollection,
      selectWorkspace,
      selectCollection,
    }),
    [
      currentUser,
      isUserLoaded,
      currentWorkspace,
      currentCollection,
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
