import Link from "next/link";

type BreadcrumbProps = {
  workspaceSlug: string;
  workspaceName: string | null;
  collectionSlug?: string;
  collectionName?: string | null;
  currentView?: string;
};

export function Breadcrumb({
  workspaceSlug,
  workspaceName,
  collectionSlug,
  collectionName,
  currentView,
}: BreadcrumbProps) {
  return (
    <>
      <Link className="brand-link" href="/">
        Jsonify
      </Link>
      <span className="brand-divider" aria-hidden="true">
        /
      </span>
      <Link className="brand-link" href="/workspaces">
        Workspaces
      </Link>
      <span className="brand-divider" aria-hidden="true">
        /
      </span>
      <Link className="brand-link" href={`/w/${workspaceSlug}`}>
        {workspaceName ?? "Workspace"}
      </Link>
      {collectionSlug && (
        <>
          <span className="brand-divider" aria-hidden="true">
            /
          </span>
          <Link
            className="brand-link project-name"
            href={`/w/${workspaceSlug}/${collectionSlug}`}
          >
            {collectionName ?? "Collection"}
          </Link>
        </>
      )}
      {currentView && (
        <>
          <span className="brand-divider" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current">{currentView}</span>
        </>
      )}
    </>
  );
}
