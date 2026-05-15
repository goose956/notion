import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// Show all tables
const tables = await sql`
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' ORDER BY table_name
`;
console.log("Tables:", tables.map(t => t.table_name).join(", "));

// Check next-auth users/accounts
try {
  const users = await sql`SELECT id, name, email FROM users`;
  console.log("\n=== Auth Users ===");
  users.forEach(u => console.log(`  ${u.name} <${u.email}>`));
} catch (e: unknown) { console.log("No users table:", (e as Error).message); }

try {
  const accounts = await sql`SELECT "userId", provider, "providerAccountId" FROM accounts`;
  console.log("\n=== Accounts ===");
  accounts.forEach(a => console.log(`  userId=${a.userId} provider=${a.provider}`));
} catch (e: unknown) { console.log("No accounts table:", (e as Error).message); }

await sql.end();
