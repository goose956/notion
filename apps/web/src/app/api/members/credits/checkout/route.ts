import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { auth } from "@/auth";
import { getSettings } from "@niche-factory/db";
import { getCreditPackage } from "@/lib/credit-packages";

const BodySchema = z.object({
  packageId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pkg = getCreditPackage(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Unknown package" }, { status: 400 });
  }

  const settings = await getSettings(["stripe.secretKey"]);
  const stripeSecret = settings["stripe.secretKey"] || process.env["STRIPE_SECRET_KEY"] || "";
  if (!stripeSecret) {
    return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2026-04-22.dahlia" });

  const origin = req.nextUrl.origin;
  const successUrl = `${origin}/members/credits?status=success&package=${encodeURIComponent(pkg.id)}`;
  const cancelUrl = `${origin}/members/credits?status=cancelled`;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pkg.priceCents,
            product_data: {
              name: `${pkg.credits} Credits`,
              description: `${pkg.name} credit package`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "credits",
        packageId: pkg.id,
        credits: String(pkg.credits),
        userEmail: session.user.email,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
