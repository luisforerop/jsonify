import FormFiller from "@/app/form-filler";

export default async function ProjectFormFillerPage({
  params,
}: PageProps<"/projects/[projectId]/form-filler">) {
  const { projectId } = await params;
  return <FormFiller projectId={projectId} />;
}
