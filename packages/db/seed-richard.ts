import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);
const email = "rthomasgoldie@gmail.com";

// Upsert Richard with 25 credits
const result = await sql`
  INSERT INTO customers (id, email, credits, created_at, updated_at)
  VALUES (gen_random_uuid(), ${email}, 25, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET credits = 25, updated_at = NOW()
  RETURNING id, email, credits
`;
console.log("Upserted:", JSON.stringify(result));

await sql.end();
