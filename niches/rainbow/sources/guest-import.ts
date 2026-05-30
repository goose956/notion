/**
 * Guest Import Adapter — Rainbow niche
 * Adapter interface version: 1
 *
 * Accepts an array of guest records (collected via chatbot conversation or
 * CSV upload) and writes them to the Guest List database.
 *
 * Each guest record is a minimal object; all fields are optional except name.
 */

import {
  registerAdapter,
  type DataAdapter,
} from "@niche-factory/adapter-runtime";

// ─── Domain types ──────────────────────────────────────────────────────────

export interface GuestRaw {
  name: string;
  email?: string;
  phone?: string;
  plusOne?: boolean;
  plusOneName?: string;
  side?: "Partner 1" | "Partner 2" | "Both";
  dietary?: string[];
  notes?: string;
}

export interface GuestRow {
  "Full Name": string;
  "RSVP": string;
  "Email": string;
  "Phone": string;
  "Plus One": boolean;
  "Plus One Name": string;
  "Side": string;
  "Dietary Requirements": string[];
  "Notes": string;
  "Invitation Sent": string;
}

export interface GuestImportCriteria {
  [key: string]: unknown;
  /** Array of guest objects to import */
  guests: GuestRaw[];
}

// ─── Adapter ───────────────────────────────────────────────────────────────

class GuestImportAdapter
  implements DataAdapter<GuestRaw, GuestRow, GuestImportCriteria>
{
  readonly id = "guest-import" as const;
  readonly niche = "rainbow" as const;
  readonly description =
    "Imports guest records into the Guest List database from chatbot input or CSV.";
  readonly requiredCredentials: readonly string[] = [];

  async *fetch(
    criteria: GuestImportCriteria,
  ): AsyncIterable<GuestRaw> {
    const guests = criteria.guests ?? [];
    console.info("[rainbow/guest-import] fetch:start", { count: guests.length });
    for (const guest of guests) {
      if (typeof guest.name === "string" && guest.name.trim().length > 0) {
        yield guest;
      }
    }
  }

  normalize(raw: GuestRaw): GuestRow {
    return {
      "Full Name": raw.name.trim(),
      "RSVP": "Pending",
      "Email": raw.email ?? "",
      "Phone": raw.phone ?? "",
      "Plus One": raw.plusOne ?? false,
      "Plus One Name": raw.plusOneName ?? "",
      "Side": raw.side ?? "Both",
      "Dietary Requirements": raw.dietary ?? ["None"],
      "Notes": raw.notes ?? "",
      "Invitation Sent": "Not Sent",
    };
  }

  cacheKey(row: GuestRow): string {
    return row["Full Name"].toLowerCase().replace(/\s+/g, "-");
  }
}

// ─── Registration ──────────────────────────────────────────────────────────

registerAdapter(new GuestImportAdapter());
