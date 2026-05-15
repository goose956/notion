// Script to list and update customer credits
import postgres from "../node_modules/postgres/src/index.js";

const sql = postgres(process.env.DATABASE_URL);

const rows = await sql`SELECT id, email, credits FROM customers ORDER BY created_at`;
console.log("=== All Customers ===");
rows.forEach(r => console.log(`  ${r.email} — ${r.credits} credits`));

// Find richard goldie (case-insensitive name match via email patterns)
// Update: set credits = 25 for any customer with 0 credits whose email matches
const target = process.argv[2]; // email passed as arg, or update all with 0

if (target) {
  const result = await sql`
    UPDATE customers SET credits = 25 WHERE email = ${target}
    RETURNING email, credits
  `;
  console.log("\nUpdated:", result);
} else {
  console.log("\nPass email as argument to update: node scripts/update-credits.mjs user@example.com");
}

await sql.end();
