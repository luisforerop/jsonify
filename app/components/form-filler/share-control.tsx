"use client";

import { useState } from "react";

import type { SavedSchema } from "@/hooks/use-saved-schemas";

type ShareControlProps = {
  schema: SavedSchema;
  onToggle: (enabled: boolean) => Promise<boolean>;
};

export function ShareControl({ schema, onToggle }: ShareControlProps) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const enabled = schema.sharingEnabled;
  const url = `${window.location.origin}/f/${schema.id}`;

  async function toggle(): Promise<void> {
    setBusy(true);
    await onToggle(!enabled);
    setBusy(false);
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; the URL stays selectable in the field.
    }
  }

  return (
    <div className="share-control">
      <label>
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          disabled={busy}
          onChange={() => void toggle()}
        />{" "}
        Accepting responses: <strong>{enabled ? "On" : "Off"}</strong>
      </label>
      <input
        type="text"
        readOnly
        value={url}
        disabled={!enabled}
        aria-label="Public form URL"
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        className="button button-outline"
        type="button"
        disabled={!enabled}
        onClick={() => void copy()}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
