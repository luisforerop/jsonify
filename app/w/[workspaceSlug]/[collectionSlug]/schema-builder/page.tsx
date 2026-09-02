import SchemaBuilder from "@/app/schema-builder";

export default async function CollectionSchemaBuilderPage({
  params,
}: PageProps<"/w/[workspaceSlug]/[collectionSlug]/schema-builder">) {
  const { workspaceSlug, collectionSlug } = await params;
  return (
    <SchemaBuilder
      workspaceSlug={workspaceSlug}
      collectionSlug={collectionSlug}
    />
  );
}
