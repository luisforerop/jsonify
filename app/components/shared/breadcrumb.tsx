import Link from "next/link";

type BreadcrumbProps = {
  projectId: string;
  projectName: string | null;
  currentView?: string;
};

export function Breadcrumb({
  projectId,
  projectName,
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
      <Link
        className="brand-link project-name"
        href={`/projects/${projectId}`}
      >
        {projectName ?? "Project"}
      </Link>
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
