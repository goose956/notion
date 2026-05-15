import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);
await sql`ALTER TABLE templates ADD COLUMN IF NOT EXISTS niche_pack_id text`;
console.log("Migration applied: niche_pack_id column added to templates");
await sql.end();
