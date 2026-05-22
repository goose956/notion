import postgres from "postgres";

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const sql = postgres(url);
  try {
    const ws = await sql.unsafe("select count(*)::int as c from app_workspaces");
    const dbs = await sql.unsafe("select count(*)::int as c from app_databases");
    const rows = await sql.unsafe(
      "select user_id, niche_pack_id, status, created_at, completed_at, error_message from app_workspaces order by created_at desc limit 20",
    );

    console.log("app_workspaces_count", ws[0]);
    console.log("app_databases_count", dbs[0]);
    console.log("recent_app_workspaces", rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("query_error", message);

    const tables = await sql.unsafe(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    console.log(
      "public_tables",
      tables.map((t: { table_name: string }) => t.table_name),
    );
  } finally {
    await sql.end();
  }
}

void main();
