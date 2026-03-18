/**
 * cancel-subscription — Cancels the user's Stripe subscription
 * at the end of the current billing period.
 *
 * POST body: {} (no params needed — uses authenticated user)
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { ok, err } from "../_shared/response.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    const user = await getUser(req);

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return err("Stripe är inte konfigurerat", 500);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Look up subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      // No active Stripe subscription — just ensure plan is free
      await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan: "gratis",
            status: "active",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      return ok({ cancelled: true, plan: "gratis" });
    }

    // Cancel at period end (user keeps access until the period expires)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Mark as cancelling in our DB
    await supabase
      .from("subscriptions")
      .update({
        status: "cancelling",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return ok({ cancelled: true, plan: subscription.plan, status: "cancelling" });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Kunde inte avsluta prenumerationen";
    return err(message, status);
  }
});
