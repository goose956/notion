import { redirect } from "next/navigation";

export default async function NicheLegacyRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/niches/${params.id}`);
}
