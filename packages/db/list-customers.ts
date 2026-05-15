import { getDb } from "./src/client.js";
import { customers } from "./src/schema.js";

const db = getDb();
const rows = await db.select({
  id: customers.id,
  email: customers.email,
  credits: customers.credits,
}).from(customers);

console.log("=== All Customers ===");
for (const r of rows) {
  console.log(`  ${r.email} — ${r.credits} credits`);
}

process.exit(0);
