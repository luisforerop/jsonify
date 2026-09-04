"use client";

import { useState, type FormEvent } from "react";

import { PanelHeading } from "@/app/components/schema-builder/panel-heading";
import {
  ScopePicker,
  scopesFromSelection,
  summarizeScopes,
  type ScopeAction,
  type ScopeSelection,
} from "@/app/components/workspaces/scope-picker";
import { useApiKeys, type CreatedApiKey } from "@/hooks/use-api-keys";
import { useCollections } from "@/hooks/use-collections";

type ApiKeysManagerProps = {
  workspaceId: string;
};

export function ApiKeysManager({ workspaceId }: ApiKeysManagerProps) {
  const { apiKeys, error, isLoaded, create, remove } = useApiKeys(workspaceId);
  const { collections } = useCollections(workspaceId);
  const [name, setName] = useState("");
  const [scopeSelection, setScopeSelection] = useState<ScopeSelection>({});
  const [nameMissing, setNameMissing] = useState(false);
  const [scopesMissing, setScopesMissing] = useState(false);
  const [revealedKey, setRevealedKey] = useState<CreatedApiKey | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  function toggleScope(target: string, action: ScopeAction, checked: boolean): void {
    setScopeSelection((current) => ({
      ...current,
      [target]: { ...current[target], [action]: checked },
    }));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    const scopes = scopesFromSelection(scopeSelection);
    setNameMissing(!trimmedName);
    setScopesMissing(scopes.length === 0);
    if (!trimmedName || scopes.length === 0) return;

    const created = await create({ name: trimmedName, workspaceId, scopes });
    if (created) {
      setRevealedKey(created);
      setCopyStatus("idle");
      setName("");
      setScopeSelection({});
    }
  }

  async function copyKey(): Promise<void> {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey.key);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      window.setTimeout(() => setCopyStatus("idle"), 1500);
    }
  }

  return (
    <section className="builder-panel" aria-labelledby="api-keys-title">
      <div className="builder-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 id="api-keys-title">API keys</h1>
        </div>
      </div>

      {revealedKey && (
        <div className="feedback-area" aria-live="polite">
          <p className="feedback success">
            Copy this key now — it will not be shown again.
          </p>
          <div className="saved-item">
            <code>{revealedKey.key}</code>
            <div className="saved-item-actions">
              <button className="copy-button" type="button" onClick={copyKey}>
                {copyStatus === "copied"
                  ? "Copied!"
                  : copyStatus === "error"
                    ? "Copy failed"
                    : "Copy key"}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => setRevealedKey(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label className="schema-name-field">
          <span>Key name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Integration"
          />
        </label>
        <div className="properties-heading">
          <div>
            <h2>Permissions</h2>
            <p>
              Choose which collections this key can access, and which actions
              it may perform on each.
            </p>
          </div>
        </div>
        <ScopePicker
          collections={collections}
          selection={scopeSelection}
          onToggle={toggleScope}
        />
        <div className="properties-heading">
          <div>
            <h2>Create key</h2>
          </div>
          <button className="button button-add" type="submit">
            Create key
          </button>
        </div>
      </form>
      {(nameMissing || scopesMissing || error) && (
        <div className="feedback-area" aria-live="polite">
          {nameMissing && (
            <p className="feedback error">Enter a name for this key.</p>
          )}
          {scopesMissing && (
            <p className="feedback error">
              Select at least one collection and action.
            </p>
          )}
          {error && <p className="feedback error">{error}</p>}
        </div>
      )}

      <PanelHeading
        eyebrow="Workspace"
        title="Existing keys"
        badge={String(apiKeys.length)}
      />
      {!isLoaded && <p className="status-copy">Loading API keys...</p>}
      {isLoaded && apiKeys.length === 0 && (
        <p className="status-copy">No API keys yet.</p>
      )}
      <ul className="saved-list">
        {apiKeys.map((key) => (
          <li className="saved-item" key={key.id}>
            <div className="saved-schema-button">
              <strong>{key.name}</strong>
              <span>
                {key.keyPrefix}… ·{" "}
                {key.lastUsedAt
                  ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                  : "never used"}
              </span>
              <div className="api-key-permissions">
                {summarizeScopes(key.scopes, collections).map((line) => (
                  <div className="api-key-permission" key={line}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
            <div className="saved-item-actions">
              <button
                className="delete-button"
                type="button"
                onClick={() => remove(key.id)}
                aria-label={`Revoke ${key.name}`}
                title={`Revoke ${key.name}`}
              >
                Revoke
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
