import { redirect } from "next/navigation";

export default function HomePage() {
  // Root route always forwards to the admin dashboard.
  redirect("/admin");
}
