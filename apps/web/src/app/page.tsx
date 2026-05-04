import { redirect } from "next/navigation";

export default function HomePage() {
  // Root route always forwards to the niches dashboard.
  redirect("/niches");
}
