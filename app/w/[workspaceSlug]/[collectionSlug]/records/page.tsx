import { Suspense } from "react";

import { RecordsView } from "@/app/components/records/records-view";

export default async function CollectionRecordsPage({
  params,
}: PageProps<"/w/[workspaceSlug]/[collectionSlug]/records">) {
  const { workspaceSlug, collectionSlug } = await params;
  return (
    <Suspense fallback={null}>
      <RecordsView
        workspaceSlug={workspaceSlug}
        collectionSlug={collectionSlug}
      />
    </Suspense>
  );
}
