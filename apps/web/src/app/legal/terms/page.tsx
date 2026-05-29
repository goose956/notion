export const metadata = { title: "Terms of Service — Stridivo" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default function TermsPage() {
  return (
    <div style={{ fontFamily: N_FONT, maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p style={{ fontSize: "13px", color: N_SUBTLE, margin: "0 0 8px" }}>Last updated: 29 May 2025</p>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: N_FG, margin: "0 0 8px" }}>Terms of Service</h1>
      <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 40px", lineHeight: 1.6 }}>
        Please read these terms carefully before using Stridivo. By creating an account or using the platform,
        you agree to be bound by these Terms of Service. If you do not agree, do not use the service.
      </p>

      {[
        {
          title: "1. About the service",
          body: `Stridivo (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates stridivo.com, an AI-powered research and workflow platform. The service allows you to run AI agents, perform web research, and manage structured data through a web interface.

Stridivo is operated as a small business based in the United Kingdom. These terms are governed by the laws of England and Wales.`,
        },
        {
          title: "2. Eligibility",
          body: "You must be at least 18 years old to use Stridivo. By registering, you confirm that the information you provide is accurate and that you have the legal capacity to enter into this agreement.",
        },
        {
          title: "3. Your account",
          body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must:

• Notify us immediately of any unauthorised access or security breach.
• Not share your account with others.
• Not create multiple accounts to circumvent credit limits or other restrictions.

We reserve the right to suspend or terminate accounts that violate these terms.`,
        },
        {
          title: "4. Credits and payment",
          body: `Access to AI features is gated by a credit system.

• New accounts receive 25 complimentary credits on registration.
• Additional credits can be purchased through our sales channels. Prices are displayed at the point of purchase.
• Credits are non-refundable except where required by law.
• Credits do not expire while your account is active.
• We reserve the right to adjust credit pricing with reasonable notice.`,
        },
        {
          title: "5. Acceptable use",
          body: `You agree not to use Stridivo to:

• Violate any applicable law or regulation.
• Infringe the intellectual property rights of others.
• Generate, distribute, or store illegal, harmful, or defamatory content.
• Attempt to reverse-engineer, scrape, or abuse the platform's APIs.
• Circumvent any access controls or rate limits.
• Use the service in a way that could damage, overload, or impair its operation.

We reserve the right to suspend access without notice if we reasonably believe these rules have been breached.`,
        },
        {
          title: "6. AI-generated content",
          body: `The platform uses third-party AI models to generate research results, drafted text, and other outputs. You acknowledge that:

• AI outputs may be inaccurate, incomplete, or out of date. Always verify important information independently.
• We are not responsible for decisions made based on AI-generated content.
• You are responsible for any content you save, publish, or act upon from the platform.`,
        },
        {
          title: "7. Third-party integrations",
          body: "Stridivo may connect to third-party services (such as Notion or external APIs) at your direction. We are not responsible for the availability, accuracy, or data handling practices of those third-party services. Your use of those integrations is subject to their respective terms.",
        },
        {
          title: "8. Intellectual property",
          body: `You retain ownership of any content you create using the platform.

Stridivo retains all rights in the platform itself, including its software, design, trademarks, and documentation. Nothing in these terms transfers any intellectual property rights to you beyond the limited licence to use the service.`,
        },
        {
          title: "9. Availability and changes",
          body: `We aim to keep Stridivo available at all times but cannot guarantee uninterrupted access. We may:

• Take the platform offline for maintenance with or without notice.
• Modify, discontinue, or limit features at any time.
• Change these terms with at least 14 days' notice for material changes, communicated by email or in-platform notice.

Continued use of the service after a change takes effect constitutes acceptance of the updated terms.`,
        },
        {
          title: "10. Limitation of liability",
          body: `To the maximum extent permitted by law:

• Stridivo is provided 'as is' without warranties of any kind.
• We are not liable for any indirect, incidental, or consequential loss arising from your use of the platform.
• Our total liability to you in any 12-month period shall not exceed the amount you paid us in that period.

Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under UK law.`,
        },
        {
          title: "11. Termination",
          body: "You may close your account at any time by contacting support@stridivo.com. We may terminate or suspend your account for breach of these terms. On termination, your right to use the service ends immediately. Unused credits are non-refundable unless the termination was caused by us without valid reason.",
        },
        {
          title: "12. Governing law",
          body: "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.",
        },
        {
          title: "13. Contact",
          body: "For questions about these terms, email us at support@stridivo.com.",
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: N_FG, margin: "0 0 10px" }}>{title}</h2>
          <div style={{ borderLeft: `3px solid ${N_BORDER}`, paddingLeft: "16px" }}>
            {body.split("\n").map((line, i) =>
              line.trim() === "" ? null : (
                <p
                  key={i}
                  style={{ fontSize: "14px", color: N_MUTED, lineHeight: 1.65, margin: "0 0 6px" }}
                  dangerouslySetInnerHTML={{ __html: line }}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
