"use client";

const ACTIONS = ["read", "write", "delete"] as const;
export type ScopeAction = (typeof ACTIONS)[number];

const ACTION_LABELS: Record<ScopeAction, string> = {
  read: "Read",
  write: "Write (create & update)",
  delete: "Delete",
};

const ACTION_SHORT_LABELS: Record<ScopeAction, string> = {
  read: "Read",
  write: "Write",
  delete: "Delete",
};

/** Which actions are granted per target: `"*"` for every collection, or a collection's slug. */
export type ScopeSelection = Record<string, Partial<Record<ScopeAction, boolean>>>;

export function scopesFromSelection(selection: ScopeSelection): string[] {
  const scopes: string[] = [];
  for (const [target, actions] of Object.entries(selection)) {
    for (const action of ACTIONS) {
      if (actions[action]) scopes.push(`${action}:${target}`);
    }
  }
  return scopes;
}

const SCOPE_PATTERN = /^(read|write|delete):(\*|.+)$/;

/**
 * Turn a key's raw scope strings into readable "target: actions" lines, e.g.
 * `["write:recetas", "read:recetas"]` -> `["Recetas: Read, Write"]`. A bare
 * `"*"` scope collapses everything into a single "full access" line.
 */
export function summarizeScopes(
  scopes: string[],
  collections: { slug: string; name: string }[],
): string[] {
  if (scopes.includes("*")) return ["Full access to everything"];

  const nameBySlug = new Map(collections.map((c) => [c.slug, c.name]));
  const actionsByTarget = new Map<string, ScopeAction[]>();

  for (const scope of scopes) {
    const match = SCOPE_PATTERN.exec(scope);
    if (!match) continue;
    const action = match[1] as ScopeAction;
    const target = match[2];
    const actions = actionsByTarget.get(target) ?? [];
    actions.push(action);
    actionsByTarget.set(target, actions);
  }

  return Array.from(actionsByTarget.entries()).map(([target, actions]) => {
    const targetLabel =
      target === "*" ? "All collections" : (nameBySlug.get(target) ?? target);
    const actionLabels = ACTIONS.filter((action) => actions.includes(action))
      .map((action) => ACTION_SHORT_LABELS[action])
      .join(", ");
    return `${targetLabel}: ${actionLabels}`;
  });
}

type ScopePickerProps = {
  collections: { id: string; slug: string; name: string }[];
  selection: ScopeSelection;
  onToggle: (target: string, action: ScopeAction, checked: boolean) => void;
};

export function ScopePicker({ collections, selection, onToggle }: ScopePickerProps) {
  const rows = [
    { target: "*", label: "All collections" },
    ...collections.map((collection) => ({
      target: collection.slug,
      label: collection.name,
    })),
  ];

  return (
    <div className="scope-picker">
      {rows.map((row) => (
        <div
          className={`scope-row${row.target === "*" ? " scope-row-all" : ""}`}
          key={row.target}
        >
          <span className="scope-row-label">{row.label}</span>
          {ACTIONS.map((action) => (
            <label className="required-field" key={action}>
              <input
                type="checkbox"
                checked={selection[row.target]?.[action] ?? false}
                onChange={(event) =>
                  onToggle(row.target, action, event.target.checked)
                }
              />
              <span>{ACTION_LABELS[action]}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
