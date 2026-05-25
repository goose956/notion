import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  addCustomerCredits,
  createPurchase,
  findOrCreateCustomer,
  getSettingValue,
  getSettings,
  upsertSetting,
} from "@niche-factory/db";

// Required: disable body parsing so we can verify the Stripe signature
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const settings = await getSettings(["stripe.secretKey", "stripe.webhookSecret"]);
  const stripeSecret = settings["stripe.secretKey"] || process.env["STRIPE_SECRET_KEY"] || "";
  const webhookSecret = settings["stripe.webhookSecret"] || process.env["STRIPE_WEBHOOK_SECRET"] || "";

  if (!stripeSecret) {
    return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecret, {
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

  const eventDedupKey = `stripe.event.${event.id}`;
  const alreadyProcessed = await getSettingValue(eventDedupKey);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    const email = session.customer_details?.email ?? metadata["userEmail"] ?? null;

    if (metadata["kind"] === "credits") {
      const credits = Number.parseInt(metadata["credits"] ?? "", 10);
      if (!email || !Number.isFinite(credits) || credits <= 0) {
        console.warn("[stripe-webhook] Missing email or invalid credits metadata", {
          email,
          credits,
          sessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      try {
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : undefined;
        await findOrCreateCustomer(email, stripeCustomerId);
        await addCustomerCredits(email, credits);
        await upsertSetting(eventDedupKey, new Date().toISOString());
      } catch (err) {
        console.error("[stripe-webhook] Failed to apply credits", err);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    const templateId = metadata["templateId"];

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
      await upsertSetting(eventDedupKey, new Date().toISOString());
    } catch (err) {
      console.error("[stripe-webhook] Failed to record purchase", err);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
