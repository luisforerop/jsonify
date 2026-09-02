"use client";

import { useEffect, useState } from "react";

const API_BASE = "/api/users";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

export type UserInput = {
  name: string;
  email: string;
  password: string;
};

export type UsersHook = {
  users: User[];
  error: string | null;
  isLoaded: boolean;
  create: (input: UserInput) => Promise<User | null>;
  read: () => Promise<void>;
};

const LOAD_ERROR = "Saved users are unavailable right now.";
const SAVE_ERROR = "Could not save your user.";

export function useUsers(): UsersHook {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function read(): Promise<void> {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setUsers((await response.json()) as User[]);
      setError(null);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    void read();
  }, []);

  async function create(input: UserInput): Promise<User | null> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const user = (await response.json()) as User;
      setUsers((current) => [...current, user]);
      setError(null);
      return user;
    } catch {
      setError(SAVE_ERROR);
      return null;
    }
  }

  return { users, error, isLoaded, create, read };
}
