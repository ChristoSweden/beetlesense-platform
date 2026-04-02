import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  CreditCard,
  Download,
  HardDrive,
  BarChart3,
  MapPin,
  Activity,
  AlertTriangle,
  X,
  Calendar,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useBillingStore, PLANS, type PlanId } from '@/stores/billingStore';
import PlanCard from '@/components/billing/PlanCard';

// ─── Helpers ───

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function usagePct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

// ─── Feature Matrix ───

interface FeatureRow {
  label: string;
  gratis: string;
  pro: string;
  enterprise: string;
}

const FEATURE_MATRIX: FeatureRow[] = [
  { label: 'Skogsfastigheter', gratis: '1', pro: '10', enterprise: 'Obegränsat' },
  { label: 'Satellitövervakning', gratis: 'Ja', pro: 'Ja', enterprise: 'Ja' },
  { label: 'Drönarövervakning', gratis: '—', pro: 'Ja', enterprise: 'Ja' },
  { label: 'AI-analys', gratis: 'Grundläggande', pro: 'Full AI-kompanjon', enterprise: 'Full AI-kompanjon' },
  { label: 'Support', gratis: 'Community', pro: 'Prioriterad', enterprise: 'Dedikerad' },
  { label: 'Dataexport', gratis: '—', pro: 'CSV, GeoJSON', enterprise: 'CSV, GeoJSON, API' },
  { label: 'PDF-rapporter', gratis: '—', pro: 'Ja', enterprise: 'Ja' },
  { label: 'API-åtkomst', gratis: '—', pro: '—', enterprise: 'Ja' },
  { label: 'Anpassade integrationer', gratis: '—', pro: '—', enterprise: 'Ja' },
  { label: 'SLA-garanti', gratis: '—', pro: '—', enterprise: 'Ja' },
];

// ─── Sub-components ───

function UsageMeter({
  icon: Icon,
  label,
  used,
  limit,
  unit,
}: {
  icon: typeof MapPin;
  label: string;
  used: number;
  limit: number;
  unit: string;
}) {
  const pct = usagePct(used, limit);
  const isHigh = pct >= 80;
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={isHigh ? 'text-amber-400' : 'text-emerald-500'} />
        <span className="text-xs font-medium text-[var(--text2)]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-lg font-bold text-[var(--text)]">{used.toLocaleString('sv-SE')}</span>
        <span className="text-xs text-[var(--text3)]">/ {limit >= 9999 ? '∞' : limit.toLocaleString('sv-SE')} {unit}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHigh ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Modals ───

function ConfirmPlanModal({
  targetPlan,
  currentPlan,
  onConfirm,
  onCancel,
  loading,
}: {
  targetPlan: PlanId;
  currentPlan: PlanId;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const plan = PLANS.find((p) => p.id === targetPlan)!;
  const isDowngrade =
    (currentPlan === 'enterprise' && targetPlan !== 'enterprise') ||
    (currentPlan === 'pro' && targetPlan === 'gratis');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text)]">
            {isDowngrade ? 'Nedgradera plan' : 'Uppgradera plan'}
          </h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)]">
            <X size={16} />
          </button>
        </div>

        {isDowngrade ? (
          <div className="mb-5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/30 mb-3">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-200/80">
                Genom att nedgradera till <strong>{plan.name}</strong> forlorar du tillgang till:
              </p>
            </div>
            <ul className="space-y-1.5 ml-1">
              {currentPlan === 'pro' && (
                <>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> Drönarövervakning
                  </li>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> Full AI-kompanjon
                  </li>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> Prioriterad support
                  </li>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> Dataexport och PDF-rapporter
                  </li>
                </>
              )}
              {currentPlan === 'enterprise' && (
                <>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> API-åtkomst
                  </li>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> Anpassade integrationer
                  </li>
                  <li className="text-xs text-[var(--text3)] flex items-center gap-2">
                    <span className="text-red-400">✕</span> Dedikerad support och SLA
                  </li>
                </>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-[var(--text2)] mb-5">
            Du uppgraderar till <strong className="text-[var(--text)]">{plan.name}</strong>
            {plan.price > 0 && (
              <> for <strong className="text-[var(--text)]">{plan.price} {plan.currency}/{plan.interval}</strong></>
            )}.
            {' '}Ändringen träder i kraft omedelbart.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[var(--bg3)] text-[var(--text2)] hover:bg-[var(--bg3)]/80 border border-[var(--border)]"
          >
            Avbryt
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2
              ${isDowngrade
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-emerald-500 text-[#030d05] hover:bg-emerald-400'
              }
              disabled:opacity-50
            `}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isDowngrade ? 'Bekräfta nedgradering' : 'Bekräfta uppgradering'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text)]">Avsluta prenumeration</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-700/30 mb-4">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-red-300 mb-1">Ar du saker?</p>
            <p className="text-[11px] text-red-300/70">
              Du forlorar tillgang till alla betalfunktioner vid slutet av din nuvarande faktureringsperiod.
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--text3)] mb-1">Du forlorar:</p>
        <ul className="space-y-1.5 mb-5 ml-1">
          <li className="text-xs text-[var(--text3)] flex items-center gap-2">
            <span className="text-red-400">✕</span> Drönarövervakning och avancerad analys
          </li>
          <li className="text-xs text-[var(--text3)] flex items-center gap-2">
            <span className="text-red-400">✕</span> AI-kompanjon och PDF-rapporter
          </li>
          <li className="text-xs text-[var(--text3)] flex items-center gap-2">
            <span className="text-red-400">✕</span> Prioriterad support
          </li>
          <li className="text-xs text-[var(--text3)] flex items-center gap-2">
            <span className="text-red-400">✕</span> Extra skogsfastigheter (max 1 pa Gratis)
          </li>
        </ul>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 text-[#030d05] hover:bg-emerald-400"
          >
            Behall min plan
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-red-600/80 text-white hover:bg-red-500 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Avsluta anda
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function BillingPage() {
  const {
    currentPlan,
    nextBillingDate,
    invoices,
    usage,
    paymentMethod,
    loading,
    error,
    loadBillingData,
    changePlan,
    updatePaymentMethod,
    cancelSubscription,
  } = useBillingStore();

  const [confirmPlan, setConfirmPlan] = useState<PlanId | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const handlePlanSelect = useCallback((planId: PlanId) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@beetlesense.ai?subject=Enterprise-plan', '_blank');
      return;
    }
    setConfirmPlan(planId);
  }, []);

  const handleConfirmChange = useCallback(async () => {
    if (!confirmPlan) return;
    setChangingPlan(true);
    await changePlan(confirmPlan);
    setChangingPlan(false);
    setConfirmPlan(null);
  }, [confirmPlan, changePlan]);

  const handleCancelSubscription = useCallback(async () => {
    setChangingPlan(true);
    await cancelSubscription();
    setChangingPlan(false);
    setShowCancel(false);
  }, [cancelSubscription]);

  const currentPlanInfo = PLANS.find((p) => p.id === currentPlan)!;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          Dashboard
        </Link>
        <ChevronRight size={12} />
        <Link to="/owner/settings" className="hover:text-[var(--text2)]">
          Installningar
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Fakturering</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-6">
        Fakturering och prenumeration
      </h1>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-[var(--text3)] mb-4">
          <Loader2 size={14} className="animate-spin" />
          Laddar faktureringsinfo...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/30 mb-4">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* ── Current Plan Summary ── */}
      <section className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
              Nuvarande plan
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold text-[var(--text)]">{currentPlanInfo.name}</h2>
              {currentPlanInfo.price > 0 && (
                <span className="text-sm text-[var(--text3)]">
                  {currentPlanInfo.price} {currentPlanInfo.currency}/{currentPlanInfo.interval}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {nextBillingDate && (
              <div className="flex items-center gap-1.5 text-[var(--text3)]">
                <Calendar size={13} />
                <span>Nästa faktura: <strong className="text-[var(--text2)]">{formatDate(nextBillingDate)}</strong></span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Plan Cards ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Valj plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              planId={plan.id}
              name={plan.name}
              price={plan.price}
              currency={plan.currency}
              interval={plan.interval}
              features={plan.features}
              isCurrent={plan.id === currentPlan}
              isPopular={plan.id === 'pro'}
              onSelect={handlePlanSelect}
              disabled={loading}
            />
          ))}
        </div>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Jamfor funktioner</h2>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                <th className="text-left p-3 text-[var(--text3)] font-medium">Funktion</th>
                <th className="text-center p-3 text-[var(--text3)] font-medium">Gratis</th>
                <th className="text-center p-3 text-emerald-400 font-medium">Pro</th>
                <th className="text-center p-3 text-[var(--text3)] font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    i % 2 === 0 ? 'bg-[var(--bg2)]/50' : ''
                  }`}
                >
                  <td className="p-3 text-[var(--text2)] font-medium">{row.label}</td>
                  <td className="p-3 text-center text-[var(--text3)]">{row.gratis}</td>
                  <td className="p-3 text-center text-[var(--text2)]">{row.pro}</td>
                  <td className="p-3 text-center text-[var(--text2)]">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Usage Meters ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Anvandning</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageMeter
            icon={MapPin}
            label="Skogsfastigheter"
            used={usage.parcelsUsed}
            limit={usage.parcelsLimit}
            unit="st"
          />
          <UsageMeter
            icon={Activity}
            label="API-anrop"
            used={usage.apiCalls}
            limit={usage.apiCallsLimit}
            unit="anrop"
          />
          <UsageMeter
            icon={HardDrive}
            label="Lagring"
            used={usage.storageMb}
            limit={usage.storageLimitMb}
            unit="MB"
          />
          <UsageMeter
            icon={BarChart3}
            label="Inventeringar denna manad"
            used={usage.surveysThisMonth}
            limit={usage.surveysLimit}
            unit="st"
          />
        </div>
      </section>

      {/* ── Payment Method ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Betalningsmetod</h2>
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-between">
          {paymentMethod ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded-lg bg-[var(--bg3)] flex items-center justify-center">
                <CreditCard size={16} className="text-[var(--text2)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text)]">
                  {paymentMethod.brand} ****{paymentMethod.last4}
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  Giltig t.o.m. {String(paymentMethod.expMonth).padStart(2, '0')}/{paymentMethod.expYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text3)]">Ingen betalningsmetod tillagd</p>
          )}
          <button
            onClick={() => updatePaymentMethod()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
          >
            Ändra
          </button>
        </div>
      </section>

      {/* ── Billing History ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Faktureringshistorik</h2>
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                <th className="text-left p-3 text-[var(--text3)] font-medium">Datum</th>
                <th className="text-left p-3 text-[var(--text3)] font-medium">Beskrivning</th>
                <th className="text-right p-3 text-[var(--text3)] font-medium">Belopp</th>
                <th className="text-center p-3 text-[var(--text3)] font-medium">Status</th>
                <th className="text-center p-3 text-[var(--text3)] font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)]/60">
                  <td className="p-3 text-[var(--text2)]">{formatDate(inv.date)}</td>
                  <td className="p-3 text-[var(--text)]">{inv.description}</td>
                  <td className="p-3 text-right text-[var(--text)] font-medium">
                    {inv.amount} {inv.currency}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        inv.status === 'paid'
                          ? 'bg-emerald-900/30 text-emerald-400'
                          : inv.status === 'pending'
                            ? 'bg-amber-900/30 text-amber-400'
                            : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {inv.status === 'paid' ? 'Betald' : inv.status === 'pending' ? 'Vantar' : 'Misslyckad'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
                      <Download size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cancel Subscription ── */}
      {currentPlan !== 'gratis' && (
        <section className="mb-8">
          <div className="p-4 rounded-2xl border border-red-900/30 bg-red-950/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--text2)]">Avsluta prenumeration</p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  Ditt konto nedgraderas till Gratis-planen vid slutet av faktureringsperioden.
                </p>
              </div>
              <button
                onClick={() => setShowCancel(true)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
              >
                Avsluta
                <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Modals ── */}
      {confirmPlan && (
        <ConfirmPlanModal
          targetPlan={confirmPlan}
          currentPlan={currentPlan}
          onConfirm={handleConfirmChange}
          onCancel={() => setConfirmPlan(null)}
          loading={changingPlan}
        />
      )}
      {showCancel && (
        <CancelModal
          onConfirm={handleCancelSubscription}
          onCancel={() => setShowCancel(false)}
          loading={changingPlan}
        />
      )}
    </div>
  );
}
