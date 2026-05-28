import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getCustomerCredits, findOrCreateCustomer, getPendingAdminRepliesCount, getCustomerWorkflows } from "@niche-factory/db";
import { MembersShell } from "./members-shell";

export const dynamic = "force-dynamic";

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // get-started lives in (onboarding) group — not protected here.
  // All other /members/* routes require a Notion session.
  if (!session) {
    redirect("/members/get-started");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Account";
  const userImage = session.user?.image ?? null;
  const initials = (userName[0] ?? "?").toUpperCase();
  const userEmail = session.user?.email ?? "";
  // Ensure customer row exists (creates with 25 credits if new)
  if (userEmail) await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = userEmail ? await getCustomerCredits(userEmail).catch(() => 0) : 0;
  const supportUnread = userEmail ? await getPendingAdminRepliesCount(userEmail).catch(() => 0) : 0;
  const activeWorkflows = userEmail ? await getCustomerWorkflows(userEmail).catch(() => [] as string[]) : [];

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <MembersShell
      userName={userName}
      userImage={userImage}
      initials={initials}
      credits={credits}
      supportUnread={supportUnread}
      activeWorkflows={activeWorkflows}
      signOutAction={signOutAction}
    >
      {children}
    </MembersShell>
  );
}
