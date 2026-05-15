import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// Check deploys table for email column
try {
  const deploys = await sql`SELECT DISTINCT notion_user_id FROM deploys LIMIT 20`;
  console.log("Deploy notion_user_ids:", JSON.stringify(deploys));
} catch (e: unknown) { console.log("deploys error:", (e as Error).message); }

// Check app_settings for any user data
try {
  const settings = await sql`SELECT key, value FROM app_settings LIMIT 20`;
  console.log("app_settings:", JSON.stringify(settings));
} catch (e: unknown) { console.log("app_settings error:", (e as Error).message); }

// Check customers columns
const cols = await sql`
  SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'customers' ORDER BY ordinal_position
`;
console.log("customers columns:", cols.map(c => `${c.column_name}(${c.data_type})`).join(", "));

await sql.end();
