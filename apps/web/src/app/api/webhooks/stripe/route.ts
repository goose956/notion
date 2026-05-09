import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { findOrCreateCustomer, createPurchase } from "@niche-factory/db";

const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

// Required: disable body parsing so we can verify the Stripe signature
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "", {
    apiVersion: "2026-04-22.dahlia",
  });

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const templateId = session.metadata?.["templateId"];
    const email = session.customer_details?.email ?? null;

    if (!templateId || !email) {
      // Can't attribute purchase without both; log and return 200 to avoid Stripe retries
      console.warn("[stripe-webhook] Missing templateId or email", {
        templateId,
        email,
        sessionId: session.id,
      });
      return NextResponse.json({ received: true });
    }

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : undefined;

    try {
      const customer = await findOrCreateCustomer(email, stripeCustomerId);
      await createPurchase({
        customerId: customer.id,
        templateId,
        stripeSessionId: session.id,
        amountPaid: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
      });
    } catch (err) {
      console.error("[stripe-webhook] Failed to record purchase", err);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
