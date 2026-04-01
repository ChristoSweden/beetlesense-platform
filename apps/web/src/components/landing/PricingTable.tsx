import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const PLANS = ['free', 'pro', 'enterprise'] as const;

const FEATURE_KEYS = [
  'parcels',
  'satelliteMonitoring',
  'healthScore',
  'aiCompanion',
  'timberMarket',
  'earlyWarning',
  'fieldMode',
  'compliance',
  'apiAccess',
  'prioritySupport',
] as const;

const PLAN_FEATURES: Record<string, boolean[]> = {
  free:       [true, true, true, false, false, false, false, false, false, false],
  pro:        [true, true, true, true, true, true, true, true, false, true],
  enterprise: [true, true, true, true, true, true, true, true, true, true],
};

export function PricingTable() {
  const { t } = useTranslation();
  const [yearly, setYearly] = useState(false);

  const monthlyPrice = 249;
  const yearlyMonthly = Math.round(monthlyPrice * 10 / 12);

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            {t('landing.pricing.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4">
            {t('landing.pricing.title')}
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto mb-8">
            {t('landing.pricing.subtitle')}
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-[var(--bg2)] border border-[var(--border)]">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !yearly ? 'bg-[var(--green)] text-[var(--bg)]' : 'text-[var(--text3)] hover:text-[var(--text)]'
              }`}
            >
              {t('landing.pricing.monthly')}
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                yearly ? 'bg-[var(--green)] text-[var(--bg)]' : 'text-[var(--text3)] hover:text-[var(--text)]'
              }`}
            >
              {t('landing.pricing.yearly')}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                yearly ? 'bg-[#030d05] text-[#030d05]' : 'bg-[#0a1f0d] text-[#22c55e]'
              }`}>
                {t('landing.pricing.yearlyDiscount')}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PLANS.map((plan) => {
            const isPopular = plan === 'pro';
            return (
              <div
                key={plan}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  isPopular
                    ? 'border-[var(--green)] bg-[var(--bg3)] glow-green scale-[1.02] md:scale-105'
                    : 'border-[var(--border)] bg-[#0a1f0d]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--green)] text-[var(--bg)] text-xs font-bold uppercase tracking-wider">
                    {t('landing.pricing.mostPopular')}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--text)] mb-1">
                    {t(`landing.pricing.plans.${plan}.name`)}
                  </h3>
                  <p className="text-sm text-[var(--text3)]">
                    {t(`landing.pricing.plans.${plan}.description`)}
                  </p>
                </div>

                <div className="mb-6">
                  {plan === 'free' && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[var(--text)]">0 kr</span>
                      <span className="text-sm text-[var(--text3)]">/{t('landing.pricing.perMonth')}</span>
                    </div>
                  )}
                  {plan === 'pro' && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[var(--green)]">
                        {yearly ? yearlyMonthly : monthlyPrice} kr
                      </span>
                      <span className="text-sm text-[var(--text3)]">/{t('landing.pricing.perMonth')}</span>
                    </div>
                  )}
                  {plan === 'enterprise' && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[var(--text)]">{t('landing.pricing.custom')}</span>
                    </div>
                  )}
                  {plan === 'pro' && yearly && (
                    <p className="text-xs text-[var(--text3)] mt-1">
                      {t('landing.pricing.billedYearly', { total: yearlyMonthly * 12 })}
                    </p>
                  )}
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {FEATURE_KEYS.map((featureKey, idx) => {
                    const included = PLAN_FEATURES[plan][idx];
                    return (
                      <li key={featureKey} className="flex items-center gap-3 text-sm">
                        {included ? (
                          <svg className="w-5 h-5 text-[var(--green)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-[var(--text3)]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={included ? 'text-[var(--text2)]' : 'text-[var(--text3)]/60'}>
                          {t(`landing.pricing.features.${featureKey}`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  to={plan === 'enterprise' ? '/contact' : '/signup'}
                  className={`block text-center py-3.5 px-6 rounded-xl font-semibold text-base transition-all active:scale-95 ${
                    isPopular
                      ? 'bg-[var(--green)] text-[var(--bg)] hover:brightness-110 shadow-lg shadow-[var(--green)]/25'
                      : 'border border-[var(--border2)] text-[var(--green)] hover:bg-[var(--bg3)] hover:border-[var(--green)]/40'
                  }`}
                >
                  {t(`landing.pricing.plans.${plan}.cta`)}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
