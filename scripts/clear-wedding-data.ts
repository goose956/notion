import postgres from "postgres";

async function main() {
  const sql = postgres(process.env["DATABASE_URL"]!);
  await sql`DELETE FROM user_criteria WHERE niche_pack_id = 'wedding-planner'`;
  await sql`DELETE FROM deploys WHERE niche_pack_id = 'wedding-planner'`;
  console.log("✓ Cleared wedding-planner criteria and deploys");
  await sql.end();
}

void main();
