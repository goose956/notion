import { auth } from "@/auth";
import { getPurchasedTemplates, listDeploysByUser } from "@niche-factory/db";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

export const metadata = { title: "Profile — Niche Factory" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_GREEN = "rgb(15,123,108)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

function PropRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "8px",
        padding: "5px 0",
        borderBottom: `1px solid ${N_BORDER}`,
      }}
    >
      <span
        style={{
          width: "160px",
          flexShrink: 0,
          fontSize: "14px",
          color: N_MUTED,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "14px",
          color: N_FG,
          fontFamily: mono ? "monospace" : N_FONT,
          flex: 1,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  const s = session!;
  const user = s.user ?? {};

  const name = user.name ?? "Member";
  const email = user.email ?? "";
  const image = user.image ?? null;
  const notionUserId = (s as unknown as Record<string, unknown>)["notionUserId"] as
    | string
    | undefined;

  const purchasedTemplates = email
    ? await getPurchasedTemplates(email).catch(() => [])
    : [];
  const deployedPacks = notionUserId
    ? await listDeploysByUser(notionUserId).catch(() => [])
    : [];

  return (
    <div style={{ fontFamily: N_FONT, color: N_FG, minHeight: "100%" }}>
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "60px 96px 80px",
        }}
      >
        {/* Page icon */}
        <div style={{ fontSize: "72px", lineHeight: 1, marginBottom: "12px" }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              width={72}
              height={72}
              style={{ borderRadius: "50%" }}
            />
          ) : (
            "👤"
          )}
        </div>

        {/* Page title */}
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: N_FG,
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
            fontFamily: N_FONT,
          }}
        >
          {name}
        </h1>
        <p style={{ fontSize: "14px", color: N_SUBTLE, marginBottom: "32px" }}>
          Your account details{notionUserId ? " and Notion workspaces" : ""}.
        </p>

        {/* Properties */}
        <div style={{ marginBottom: "48px" }}>
          {email && <PropRow label="Email" value={email} />}
          <PropRow label="Connected via" value={notionUserId ? "Notion OAuth" : "Email"} />
          {notionUserId && (
            <PropRow label="Notion user ID" value={notionUserId} mono />
          )}
        </div>

        {/* ── Deployed workspaces ──────────────────────────────────────── */}
        <section style={{ marginBottom: "48px" }}>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: N_FG,
              marginBottom: "12px",
              fontFamily: N_FONT,
            }}
          >
            Deployed workspaces
          </h2>

          {deployedPacks.length === 0 ? (
            <p style={{ fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
              No niche packs deployed yet.{" "}
              <Link
                href="/members/chat"
                style={{ color: N_BLUE, textDecoration: "none" }}
              >
                Open Research Assistant →
              </Link>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {deployedPacks.map((d) => {
                const dbCount = Object.keys(
                  (d.databaseIdMap as Record<string, string> | null) ?? {},
                ).length;
                const deployedAt = d.completedAt ?? d.createdAt;
                return (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "8px 12px",
                      borderRadius: "3px",
                      border: `1px solid ${N_BORDER_MED}`,
                    }}
                  >
                    <CheckCircle2
                      style={{
                        width: "16px",
                        height: "16px",
                        color: N_GREEN,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: N_FG,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.nicheName}
                      </p>
                      <p style={{ fontSize: "12px", color: N_MUTED }}>
                        {dbCount} database{dbCount !== 1 ? "s" : ""} · deployed{" "}
                        {deployedAt
                          ? new Date(deployedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                    <a
                      href={`https://notion.so/${d.notionParentPageId.replace(/-/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "14px",
                        color: N_BLUE,
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                    >
                      Open in Notion
                      <ExternalLink style={{ width: "12px", height: "12px" }} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── My Templates ─────────────────────────────────────────────── */}
        <section>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: N_FG,
              marginBottom: "12px",
              fontFamily: N_FONT,
            }}
          >
            My Templates
          </h2>

          {purchasedTemplates.length === 0 ? (
            <p style={{ fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
              No templates purchased yet.{" "}
              <Link
                href="/"
                style={{ color: N_BLUE, textDecoration: "none" }}
              >
                Browse templates →
              </Link>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {purchasedTemplates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    border: `1px solid ${N_BORDER_MED}`,
                  }}
                >
                  <span style={{ fontSize: "16px", lineHeight: 1, flexShrink: 0 }}>
                    📄
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        color: N_FG,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.title}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: N_MUTED,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.tagline}
                    </p>
                  </div>
                  <Link
                    href={`/templates/${t.slug}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "14px",
                      color: N_BLUE,
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                  >
                    View
                    <ArrowRight style={{ width: "12px", height: "12px" }} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

