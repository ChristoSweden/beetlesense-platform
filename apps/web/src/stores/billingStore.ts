import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// ─── Types ───

export type PlanId = 'gratis' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
  description: string;
}

export interface UsageStats {
  parcelsUsed: number;
  parcelsLimit: number;
  apiCalls: number;
  apiCallsLimit: number;
  storageMb: number;
  storageLimitMb: number;
  surveysThisMonth: number;
  surveysLimit: number;
}

export interface PaymentMethod {
  type: 'card';
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

export const PLANS: PlanInfo[] = [
  {
    id: 'gratis',
    name: 'Gratis',
    price: 0,
    currency: 'kr',
    interval: 'månad',
    features: [
      '1 skogsfastighet',
      'Satellitövervakning',
      'Grundläggande AI-analys',
      'Community-åtkomst',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 249,
    currency: 'kr',
    interval: 'månad',
    features: [
      'Upp till 10 skogsfastigheter',
      'Drönare + satellitövervakning',
      'Full AI-kompanjon',
      'Prioriterad support',
      'Dataexport (CSV, GeoJSON)',
      'PDF-rapporter',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: -1,
    currency: 'kr',
    interval: 'månad',
    features: [
      'Obegränsat antal fastigheter',
      'API-åtkomst',
      'Anpassade integrationer',
      'Dedikerad support',
      'SLA-garanti',
      'On-premise möjlighet',
    ],
  },
];

// ─── Usage limits per plan ───

const PLAN_LIMITS: Record<PlanId, Pick<UsageStats, 'parcelsLimit' | 'apiCallsLimit' | 'storageLimitMb' | 'surveysLimit'>> = {
  gratis: { parcelsLimit: 1, apiCallsLimit: 100, storageLimitMb: 256, surveysLimit: 3 },
  pro: { parcelsLimit: 10, apiCallsLimit: 5000, storageLimitMb: 2048, surveysLimit: 20 },
  enterprise: { parcelsLimit: 9999, apiCallsLimit: 100000, storageLimitMb: 51200, surveysLimit: 9999 },
};

// ─── Subscription status type ───

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'cancelling'
  | 'unpaid'
  | null;

// ─── Store ───

interface BillingState {
  currentPlan: PlanId;
  billingCycle: BillingCycle;
  nextBillingDate: string | null;
  invoices: Invoice[];
  usage: UsageStats;
  paymentMethod: PaymentMethod | null;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  loading: boolean;
  error: string | null;

  isPlanActive: () => boolean;
  loadBillingData: () => Promise<void>;
  changePlan: (planId: PlanId) => Promise<void>;
  updatePaymentMethod: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
  });
  if (error) {
    throw new Error(error.message ?? `Fel vid anrop till ${name}`);
  }
  return data as T;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  currentPlan: 'gratis',
  billingCycle: 'monthly',
  nextBillingDate: null,
  invoices: [],
  usage: {
    parcelsUsed: 0,
    parcelsLimit: 1,
    apiCalls: 0,
    apiCallsLimit: 100,
    storageMb: 0,
    storageLimitMb: 256,
    surveysThisMonth: 0,
    surveysLimit: 3,
  },
  paymentMethod: null,
  stripeCustomerId: null,
  subscriptionStatus: null,
  loading: false,
  error: null,

  // Returns true only when the subscription is active or trialing
  isPlanActive: () => {
    const { subscriptionStatus, currentPlan } = get();
    // Gratis plan is always "active" (no subscription needed)
    if (currentPlan === 'gratis') return true;
    return subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  },

  // ─── Load billing data from Supabase ───
  loadBillingData: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false, error: 'Inte inloggad' });
        return;
      }

      // Fetch subscription record
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) throw subError;

      const plan: PlanId = subscription?.plan ?? 'gratis';
      const status: SubscriptionStatus = subscription?.status ?? null;
      const limits = PLAN_LIMITS[plan];

      // Fetch usage stats
      const { data: usageData } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch invoices
      const { data: invoiceRows } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(12);

      const invoices: Invoice[] = (invoiceRows ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        date: row.date as string,
        amount: row.amount as number,
        currency: (row.currency as string) ?? 'SEK',
        status: row.status as Invoice['status'],
        pdfUrl: (row.pdf_url as string) ?? '#',
        description: row.description as string,
      }));

      set({
        currentPlan: plan,
        subscriptionStatus: status,
        billingCycle: (subscription?.billing_cycle as BillingCycle) ?? 'monthly',
        nextBillingDate: subscription?.current_period_end ?? null,
        stripeCustomerId: subscription?.stripe_customer_id ?? null,
        paymentMethod: subscription?.payment_method
          ? (subscription.payment_method as PaymentMethod)
          : null,
        usage: {
          parcelsUsed: usageData?.parcels_used ?? 0,
          ...limits,
          apiCalls: usageData?.api_calls ?? 0,
          storageMb: usageData?.storage_mb ?? 0,
          surveysThisMonth: usageData?.surveys_this_month ?? 0,
        },
        invoices,
        loading: false,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Kunde inte ladda faktureringsdata';
      set({ loading: false, error: message });
    }
  },

  // ─── Change plan via Stripe Checkout ───
  changePlan: async (planId: PlanId) => {
    set({ loading: true, error: null });
    try {
      // Enterprise: open contact form
      if (planId === 'enterprise') {
        window.open('mailto:enterprise@beetlesense.ai?subject=Enterprise-förfrågan', '_blank');
        set({ loading: false });
        return;
      }

      // Downgrade to free: cancel subscription
      if (planId === 'gratis') {
        await get().cancelSubscription();
        return;
      }

      // Pro: create Stripe Checkout session
      const result = await invokeEdgeFunction<{ url: string }>('create-checkout-session', {
        plan_id: planId,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Ingen checkout-URL mottagen');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Kunde inte byta plan';
      set({ loading: false, error: message });
    }
  },

  // ─── Open Stripe Customer Portal to manage payment method ───
  updatePaymentMethod: async () => {
    set({ loading: true, error: null });
    try {
      const result = await invokeEdgeFunction<{ url: string }>('create-checkout-session', {
        portal: true,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Kunde inte öppna betalningsportalen');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Kunde inte uppdatera betalningsmetod';
      set({ loading: false, error: message });
    }
  },

  // ─── Cancel subscription ───
  cancelSubscription: async () => {
    set({ loading: true, error: null });
    try {
      await invokeEdgeFunction('cancel-subscription', {});
      // Reload billing data to reflect changes
      await get().loadBillingData();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Kunde inte avsluta prenumerationen';
      set({ loading: false, error: message });
    }
  },
}));
