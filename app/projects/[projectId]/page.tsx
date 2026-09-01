import { WorkspacePanel } from "@/app/components/projects/workspace-panel";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  return <WorkspacePanel projectId={projectId} />;
}
