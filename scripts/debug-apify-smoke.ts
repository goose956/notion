import "../niches/local-business-lead-tracker/sources/apify-google-places.ts";
import { getAdapter } from "../packages/adapter-runtime/src/index.ts";

async function main() {
  const adapter = getAdapter("local-business-lead-tracker", "apify-google-places");
  if (adapter === undefined) {
    throw new Error("Adapter not found");
  }

  const token = process.env["APIFY_TOKEN"];
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("APIFY_TOKEN is missing");
  }

  const criteria = {
    keywords: ["plumber"],
    locations: ["london"],
    maxResults: 30,
    country: "UK",
  };

  const rows: unknown[] = [];
  for await (const raw of adapter.fetch(criteria as never, { APIFY_TOKEN: token })) {
    rows.push(raw);
    if (rows.length >= 5) break;
  }

  console.log(JSON.stringify({ fetchedFirstFive: rows.length, sample: rows.slice(0, 2) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});