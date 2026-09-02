"use client";

import { useState, type FormEvent } from "react";

import type { UserInput } from "@/hooks/use-users";

type UserSignupFormProps = {
  persistenceError: string | null;
  onCreate: (input: UserInput) => Promise<boolean>;
};

export function UserSignupForm({
  persistenceError,
  onCreate,
}: UserSignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const isMissing = !trimmedName || !trimmedEmail || !password;
    setMissing(isMissing);
    if (isMissing) return;

    const created = await onCreate({
      name: trimmedName,
      email: trimmedEmail,
      password,
    });
    if (created) {
      setName("");
      setEmail("");
      setPassword("");
      setMissing(false);
    }
  }

  return (
    <section className="builder-panel" aria-labelledby="new-user-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Users</p>
          <h1 id="new-user-title">Create a user</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="schema-name-field">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Carlos"
          />
        </label>
        <label className="schema-name-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="carlos@example.com"
          />
        </label>
        <label className="schema-name-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Stored as-is for now"
          />
        </label>
        <div className="properties-heading">
          <div>
            <h2>Register</h2>
            <p>No authentication yet — this just creates a user record.</p>
          </div>
          <button className="button button-add" type="submit">
            Create user
          </button>
        </div>
      </form>
      {(missing || persistenceError) && (
        <div className="feedback-area" aria-live="polite">
          {missing && (
            <p className="feedback error">Name, email, and password are required.</p>
          )}
          {persistenceError && (
            <p className="feedback error">{persistenceError}</p>
          )}
        </div>
      )}
    </section>
  );
}
