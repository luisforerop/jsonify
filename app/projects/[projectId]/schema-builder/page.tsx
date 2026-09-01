import SchemaBuilder from "@/app/schema-builder";

export default async function ProjectSchemaBuilderPage({
  params,
}: PageProps<"/projects/[projectId]/schema-builder">) {
  const { projectId } = await params;
  return <SchemaBuilder projectId={projectId} />;
}
