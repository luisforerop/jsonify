import { CollectionView } from "@/app/components/collections/collection-view";

export default async function CollectionPage({
  params,
}: PageProps<"/w/[workspaceSlug]/[collectionSlug]">) {
  const { workspaceSlug, collectionSlug } = await params;
  return (
    <CollectionView
      workspaceSlug={workspaceSlug}
      collectionSlug={collectionSlug}
    />
  );
}
