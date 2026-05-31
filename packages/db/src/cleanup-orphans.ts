/**
 * cleanup-orphans.ts — removes all orphaned workspace data.
 *
 * "Orphaned" = app_workspaces where the userId (email) has no matching
 * row in the customers table. This happens when a customer was deleted
 * before the cascade-delete fix was in place.
 *
 * Run with:
 *   pnpm --filter @niche-factory/db cleanup-orphans
 */

import { db } from "./client.js";
import { appWorkspaces, appDatabases, appRows, customers } from "./schema.js";
import { eq, notInArray, sql } from "drizzle-orm";

async function main() {
  console.log("Fetching all customer emails...");
  const customerRows = await db.select({ email: customers.email }).from(customers);
  const knownEmails = customerRows.map((r) => r.email);
  console.log(`  ${knownEmails.length} customers found.`);

  console.log("Fetching all workspace user IDs...");
  const allWorkspaces = await db
    .select({ id: appWorkspaces.id, userId: appWorkspaces.userId })
    .from(appWorkspaces);
  console.log(`  ${allWorkspaces.length} workspaces found.`);

  const orphaned = knownEmails.length === 0
    ? allWorkspaces
    : allWorkspaces.filter((ws) => !knownEmails.includes(ws.userId));

  console.log(`  ${orphaned.length} orphaned workspaces to delete.`);

  if (orphaned.length === 0) {
    console.log("Nothing to clean up.");
    process.exit(0);
  }

  let totalRows = 0;
  let totalDbs = 0;

  for (const ws of orphaned) {
    const dbs = await db
      .select({ id: appDatabases.id })
      .from(appDatabases)
      .where(eq(appDatabases.workspaceId, ws.id));

    for (const d of dbs) {
      const deleted = await db.delete(appRows).where(eq(appRows.databaseId, d.id)).returning();
      totalRows += deleted.length;
    }

    const deletedDbs = await db.delete(appDatabases).where(eq(appDatabases.workspaceId, ws.id)).returning();
    totalDbs += deletedDbs.length;

    await db.delete(appWorkspaces).where(eq(appWorkspaces.id, ws.id));
    console.log(`  Deleted workspace ${ws.id} (user: ${ws.userId})`);
  }

  console.log(`\nDone.`);
  console.log(`  Workspaces deleted: ${orphaned.length}`);
  console.log(`  Databases deleted:  ${totalDbs}`);
  console.log(`  Rows deleted:       ${totalRows}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
