/**
 * create-checkout-session — Creates a Stripe Checkout session or
 * redirects to the Stripe Customer Portal.
 *
 * POST body:
 *   { plan_id: "pro" }           → Checkout session for Pro plan
 *   { portal: true }             → Customer Portal session (manage payment method)
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { ok, err } from "../_shared/response.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

// ─── Plan → Stripe Price mapping ───

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  pro: Deno.env.get("STRIPE_PRO_PRICE_ID"),
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    const user = await getUser(req);
    const body = await req.json();

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return err("Stripe är inte konfigurerat", 500);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Look up or create Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "gratis",
          status: "active",
        },
        { onConflict: "user_id" },
      );
    }

    // ─── Customer Portal (manage payment method) ───
    if (body.portal === true) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.headers.get("origin") ?? Deno.env.get("SITE_URL")}/owner/billing`,
      });
      return ok({ url: portalSession.url });
    }

    // ─── Checkout Session (upgrade to paid plan) ───
    const planId = body.plan_id as string;
    if (!planId || planId === "gratis" || planId === "enterprise") {
      return err("Ogiltig plan", 400);
    }

    const priceId = PLAN_PRICE_MAP[planId];
    if (!priceId) {
      return err(`Inget pris konfigurerat för plan: ${planId}`, 400);
    }

    const origin = req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/owner/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/owner/billing?status=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
      },
      locale: "sv",
      currency: "sek",
    });

    return ok({ url: session.url });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Okänt fel";
    return err(message, status);
  }
});
