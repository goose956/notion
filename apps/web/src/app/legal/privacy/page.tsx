export const metadata = { title: "Privacy Policy — Stridivo" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: N_FONT, maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p style={{ fontSize: "13px", color: N_SUBTLE, margin: "0 0 8px" }}>Last updated: 29 May 2025</p>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: N_FG, margin: "0 0 8px" }}>Privacy Policy</h1>
      <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 40px", lineHeight: 1.6 }}>
        This policy explains how Stridivo (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, and protects your
        personal data when you use stridivo.com. We are committed to complying with the UK GDPR and the
        Data Protection Act 2018.
      </p>

      {[
        {
          title: "1. Who we are",
          body: "Stridivo is operated as a sole trader / small business based in the United Kingdom. For data protection enquiries, contact us at: support@stridivo.com.",
        },
        {
          title: "2. Data we collect",
          body: `We collect only the data needed to provide our service:

• Account data — your name and email address when you register.
• Usage data — credits consumed, workflow activity, and session logs for billing and debugging purposes.
• Messages — research queries you submit to the AI assistant and the responses returned. These are processed in real time and not stored permanently on our servers.
• Payment data — we do not store payment card details. Payments are handled by third-party platforms (e.g. Etsy). We receive only an order confirmation.
• Technical data — IP address, browser type, and device information collected automatically via standard server logs.`,
        },
        {
          title: "3. How we use your data",
          body: `We use your data to:

• Provide and operate the Stridivo platform.
• Process your account and credit balance.
• Send transactional emails (e.g. account activation, credit top-up confirmation).
• Diagnose technical issues and improve the service.
• Comply with legal obligations.

We do not sell, rent, or share your personal data with third parties for marketing purposes.`,
        },
        {
          title: "4. Legal basis for processing (UK GDPR)",
          body: `We rely on the following lawful bases:

• Contract — processing is necessary to perform our service agreement with you.
• Legitimate interests — improving service quality, preventing fraud, and maintaining security.
• Legal obligation — where we are required to retain data by law.`,
        },
        {
          title: "5. Third-party services",
          body: `To operate the platform we use a small number of trusted third-party processors:

• AI providers (e.g. Anthropic) — to power the research assistant. Queries are processed per their data handling policies.
• Hosting providers — our infrastructure is hosted on cloud platforms in the UK/EU or with standard data transfer safeguards in place.
• Notion — if you connect your Notion workspace, data you choose to sync is sent directly to Notion under your Notion account terms.

We ensure all processors provide adequate data protection guarantees.`,
        },
        {
          title: "6. Data retention",
          body: "We retain your account data for as long as your account is active, plus up to 90 days after deletion to allow for dispute resolution. Usage logs are retained for up to 12 months. You may request earlier deletion at any time (see section 8).",
        },
        {
          title: "7. Cookies",
          body: "We use a single session cookie to keep you logged in. We do not use advertising or tracking cookies. No cookie consent banner is required for strictly necessary cookies.",
        },
        {
          title: "8. Your rights",
          body: `Under UK GDPR you have the right to:

• Access — request a copy of the personal data we hold about you.
• Rectification — ask us to correct inaccurate data.
• Erasure — request deletion of your personal data ('right to be forgotten').
• Restriction — ask us to limit processing in certain circumstances.
• Portability — receive your data in a structured, machine-readable format.
• Object — object to processing based on legitimate interests.
• Withdraw consent — where processing is based on consent.

To exercise any of these rights, email support@stridivo.com. We will respond within 30 days.`,
        },
        {
          title: "9. Data security",
          body: "We use industry-standard measures to protect your data, including encrypted connections (HTTPS), access controls, and regular security reviews. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.",
        },
        {
          title: "10. International transfers",
          body: "Some of our third-party processors may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place, such as UK adequacy decisions or Standard Contractual Clauses.",
        },
        {
          title: "11. Complaints",
          body: "If you believe we have handled your data unlawfully, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.",
        },
        {
          title: "12. Changes to this policy",
          body: "We may update this policy from time to time. We will notify you of material changes by email or by displaying a notice in the platform. The 'last updated' date at the top of this page will always reflect the latest revision.",
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: N_FG, margin: "0 0 10px" }}>{title}</h2>
          <div style={{ borderLeft: `3px solid ${N_BORDER}`, paddingLeft: "16px" }}>
            {body.split("\n").map((line, i) =>
              line.trim() === "" ? null : (
                <p key={i} style={{ fontSize: "14px", color: N_MUTED, lineHeight: 1.65, margin: "0 0 6px" }}>
                  {line}
                </p>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
