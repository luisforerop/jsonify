"use client";

import { useState } from "react";

import {
  buildCurlExample,
  buildFetchExample,
  requestForAction,
  type ApiExampleAction,
} from "@/app/components/collections/api-example";

type ApiExamplePanelProps = {
  workspaceId: string;
  collectionSlug: string;
};

const ACTIONS: { value: ApiExampleAction; label: string }[] = [
  { value: "read", label: "Read" },
  { value: "write", label: "Write (create & update)" },
  { value: "delete", label: "Delete" },
];

/**
 * Copyable curl/fetch example for one action against this collection. The
 * caller's actual API key isn't known here, so the snippet carries the
 * `<api-key>` placeholder for the caller to swap in.
 */
export function ApiExamplePanel({ workspaceId, collectionSlug }: ApiExamplePanelProps) {
  const [action, setAction] = useState<ApiExampleAction>("read");
  const [format, setFormat] = useState<"curl" | "fetch">("curl");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = {
    origin,
    workspaceId,
    apiKey: "<api-key>",
    request: requestForAction(action, collectionSlug),
  };
  const snippet =
    format === "curl" ? buildCurlExample(params) : buildFetchExample(params);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      window.setTimeout(() => setCopyStatus("idle"), 1500);
    }
  }

  return (
    <div className="api-example">
      <p className="status-copy">
        Swap <code>&lt;api-key&gt;</code> for a real key from this
        workspace&apos;s API keys panel.
      </p>
      <div className="api-example-tabs">
        {ACTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`text-button${action === value ? " is-active" : ""}`}
            onClick={() => setAction(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="api-example-tabs">
        <button
          type="button"
          className={`text-button${format === "curl" ? " is-active" : ""}`}
          onClick={() => setFormat("curl")}
        >
          curl
        </button>
        <button
          type="button"
          className={`text-button${format === "fetch" ? " is-active" : ""}`}
          onClick={() => setFormat("fetch")}
        >
          fetch
        </button>
      </div>
      <pre className="api-example-snippet">{snippet}</pre>
      <button className="copy-button" type="button" onClick={copy}>
        {copyStatus === "copied"
          ? "Copied!"
          : copyStatus === "error"
            ? "Copy failed"
            : `Copy ${format} example`}
      </button>
    </div>
  );
}
