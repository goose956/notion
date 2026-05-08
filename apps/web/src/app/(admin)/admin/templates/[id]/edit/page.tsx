import { notFound } from "next/navigation";
import { getTemplateById } from "@niche-factory/db";
import { TemplateEditor } from "@/components/templates/template-editor";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getTemplateById(id).catch(() => undefined);
  if (!row) notFound();

  return <TemplateEditor initialRow={row} />;
}
