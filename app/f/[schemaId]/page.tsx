import { notFound } from "next/navigation";

import { PublicForm } from "@/app/components/form-filler/public-form";
import { repositories } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicFormPage({
  params,
}: PageProps<"/f/[schemaId]">) {
  const { schemaId } = await params;
  const schema = UUID_RE.test(schemaId)
    ? await repositories.schemas.findById(schemaId)
    : null;
  if (!schema) notFound();

  if (!schema.sharingEnabled) {
    return (
      <main className="workspace-shell">
        <section className="builder-panel">
          <div className="empty-properties">
            <strong>This form is not accepting responses</strong>
            <span>The owner has closed this form. Contact them if you need access.</span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <PublicForm
        schemaId={schema.id}
        schemaName={schema.name}
        schema={schema.schemaDefinition}
      />
    </main>
  );
}
