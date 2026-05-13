import { redirect } from "next/navigation";

export default function MembersIndexPage() {
  redirect("/members/profile");
}
