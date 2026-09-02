import FormFiller from "@/app/form-filler";

export default async function CollectionFormFillerPage({
  params,
}: PageProps<"/w/[workspaceSlug]/[collectionSlug]/form-filler">) {
  const { workspaceSlug, collectionSlug } = await params;
  return (
    <FormFiller workspaceSlug={workspaceSlug} collectionSlug={collectionSlug} />
  );
}
