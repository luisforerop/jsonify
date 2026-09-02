import { WorkspaceCollections } from "@/app/components/collections/workspace-collections";

export default async function WorkspacePage({
  params,
}: PageProps<"/w/[workspaceSlug]">) {
  const { workspaceSlug } = await params;
  return <WorkspaceCollections workspaceSlug={workspaceSlug} />;
}
