import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// 1. Add credits column if missing
try {
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 25`;
  console.log("Migration: credits column added");
} catch (e: unknown) {
  console.log("Migration note:", (e as Error).message);
}

// 2. List all customers
const rows = await sql<{ id: number; email: string; credits: number }[]>`
  SELECT id, email, credits FROM customers ORDER BY created_at
`;
console.log("\n=== Customers ===");
rows.forEach(r => console.log(`  [${r.id}] ${r.email} — ${r.credits} credits`));

await sql.end();
