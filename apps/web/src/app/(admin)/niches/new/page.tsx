import { redirect } from "next/navigation";

export default function NewNicheLegacyRedirectPage() {
  redirect("/admin/niches/new");
}
