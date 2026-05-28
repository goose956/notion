import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getCustomerCredits, findOrCreateCustomer, getPendingAdminRepliesCount, getCustomerWorkflows, listAppWorkspacesByUser } from "@niche-factory/db";
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
  const [explicitWorkflows, appWorkspaceNiches] = userEmail
    ? await Promise.all([
        getCustomerWorkflows(userEmail).catch(() => [] as string[]),
        listAppWorkspacesByUser(userEmail).then((ws) => ws.map((w) => w.nichePackId)).catch(() => [] as string[]),
      ])
    : [[] as string[], [] as string[]];
  // Merge: start with app_workspaces niches (user's original), then add any extras from customer_workflows
  const activeWorkflows = [
    ...appWorkspaceNiches,
    ...explicitWorkflows.filter((id) => !appWorkspaceNiches.includes(id)),
  ];

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
