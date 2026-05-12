import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSettings, getTemplateById } from "@niche-factory/db";

export async function POST(req: NextRequest) {
  const settings = await getSettings(["stripe.secretKey"]);
  const stripeSecret = settings["stripe.secretKey"] || process.env["STRIPE_SECRET_KEY"] || "";

  if (!stripeSecret) {
    return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2026-04-22.dahlia",
  });

  const body = await req.json().catch(() => ({}));
  const templateId = typeof body.templateId === "string" ? body.templateId : null;
  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  const template = await getTemplateById(templateId).catch(() => undefined);
  if (!template || !template.published) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Require stripePriceId for dynamic checkout
  if (!template.stripePriceId) {
    // Fall back to static payment link if no price ID is configured
    if (template.stripePaymentLink) {
      return NextResponse.json({ url: template.stripePaymentLink });
    }
    return NextResponse.json({ error: "No payment configured for this template" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env["AUTH_URL"] ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: template.stripePriceId, quantity: 1 }],
    metadata: { templateId: template.id },
    customer_creation: "always",
    // Collect billing email so we can link to their account
    billing_address_collection: "auto",
    success_url: `${origin}/templates/${template.slug}?purchased=1`,
    cancel_url: `${origin}/templates/${template.slug}`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
