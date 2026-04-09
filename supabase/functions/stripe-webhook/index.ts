/**
 * stripe-webhook — Handles Stripe webhook events to keep
 * the subscriptions table in sync.
 *
 * Events handled:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 */

import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

// Reverse lookup: Stripe Price ID → BeetleSense plan
function priceIdToPlan(priceId: string): string {
  const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
  if (priceId === proPriceId) return "pro";
  return "gratis";
}

function stripePlanInterval(sub: Stripe.Subscription): string {
  const interval = sub.items.data[0]?.plan?.interval;
  return interval === "year" ? "yearly" : "monthly";
}

Deno.serve(async (req: Request) => {
  // Webhook endpoint does not require CORS preflight, but handle it gracefully
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Stripe-konfiguration saknas" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" });

  // ─── Verify webhook signature ───
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "Saknar stripe-signature header" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ogiltig signatur";
    console.error("Webhook-signaturverifiering misslyckades:", msg);
    return new Response(
      JSON.stringify({ error: `Webhook-signatur ogiltig: ${msg}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ─── Supabase admin client ───
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // ── Idempotency: skip already-processed events ───────────────────────
  const { data: alreadyProcessed } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (alreadyProcessed) {
    return new Response(
      JSON.stringify({ received: true, duplicate: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    switch (event.type) {
      // ─── Checkout completed ───
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id ?? "pro";

        if (!userId) {
          console.error("checkout.session.completed: saknar supabase_user_id i metadata");
          break;
        }

        // Retrieve the full subscription to get period info
        const sub = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription as string)
          : null;

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: (session.subscription as string) ?? null,
            plan: planId,
            status: "active",
            billing_cycle: sub ? stripePlanInterval(sub) : "monthly",
            current_period_end: sub
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        console.log(`Prenumeration skapad: user=${userId} plan=${planId}`);
        break;
      }

      // ─── Subscription updated (plan change, renewal, payment method update) ───
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Look up user by stripe_customer_id
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!existingSub) {
          console.warn(`subscription.updated: okänd kund ${customerId}`);
          break;
        }

        const priceId = sub.items.data[0]?.price?.id ?? "";
        const plan = priceIdToPlan(priceId);
        const status = sub.cancel_at_period_end ? "cancelling" : sub.status === "active" ? "active" : sub.status;

        await supabase
          .from("subscriptions")
          .update({
            plan,
            status,
            stripe_subscription_id: sub.id,
            billing_cycle: stripePlanInterval(sub),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existingSub.user_id);

        console.log(`Prenumeration uppdaterad: user=${existingSub.user_id} plan=${plan} status=${status}`);
        break;
      }

      // ─── Subscription deleted (cancelled, expired) ───
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!existingSub) {
          console.warn(`subscription.deleted: okänd kund ${customerId}`);
          break;
        }

        // Downgrade to free plan and mark as canceled so the app can gate features correctly
        await supabase
          .from("subscriptions")
          .update({
            plan: "gratis",
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            billing_cycle: "monthly",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existingSub.user_id);

        console.log(`Prenumeration avslutad → gratis: user=${existingSub.user_id}`);
        break;
      }

      default:
        console.log(`Ohanterad webhook-typ: ${event.type}`);
    }

    // ── Record processed event for idempotency ─────────────────────────
    await supabase.from("webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Webhook-hanteringsfel";
    console.error("Webhook-hantering misslyckades:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
