import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Leaf,
  TreePine,
  ShieldCheck,
  Award,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  type CarbonParcel,
  type BiodiversityEligibility,
  assessBiodiversity,
  formatSEK,
} from '@/services/carbonService';

// ─── Eligibility badge ───

function EligibilityBadge({ eligible, label }: { eligible: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {eligible ? (
        <CheckCircle2 size={14} className="text-[var(--green)] flex-shrink-0" />
      ) : (
        <XCircle size={14} className="text-[var(--text3)] flex-shrink-0" />
      )}
      <span className={`text-xs ${eligible ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───

interface BiodiversityCreditsProps {
  parcels: CarbonParcel[];
}

export function BiodiversityCredits({ parcels }: BiodiversityCreditsProps) {
  const { t } = useTranslation();

  const eligibility: BiodiversityEligibility = useMemo(
    () => assessBiodiversity(parcels),
    [parcels],
  );

  const totalArea = parcels.reduce((s, p) => s + p.areaHa, 0);

  return (
    <div className="space-y-6">
      {/* EU Biodiversity Strategy */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Leaf size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('carbon.biodiversity.euStrategy')}
            </h3>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('carbon.biodiversity.euStrategyDesc')}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 mb-4">
          <EligibilityBadge
            eligible={eligibility.euBiodiversity2030}
            label={t('carbon.biodiversity.euEligible')}
          />
          <EligibilityBadge
            eligible={eligibility.speciesRichStands}
            label={t('carbon.biodiversity.speciesRich')}
          />
          <EligibilityBadge
            eligible={parcels.some((p) => p.ageYears >= 80)}
            label={t('carbon.biodiversity.oldGrowth')}
          />
        </div>

        {eligibility.euBiodiversity2030 && (
          <div className="p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
            <p className="text-xs text-[var(--green)] font-medium">
              {t('carbon.biodiversity.euEligibleNote')}
            </p>
          </div>
        )}
      </div>

      {/* LONA Grants */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#fbbf24]/10">
            <Award size={20} className="text-[#fbbf24]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('carbon.biodiversity.lonaTitle')}
            </h3>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('carbon.biodiversity.lonaDesc')}
            </p>
          </div>
        </div>

        <EligibilityBadge
          eligible={eligibility.lonaEligible}
          label={t('carbon.biodiversity.lonaEligible')}
        />

        {eligibility.lonaEligible && (
          <div className="mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-xs text-[var(--text2)]">
              {t('carbon.biodiversity.lonaGrantInfo')}
            </p>
            <a
              href="https://www.naturvardsverket.se/bidrag/lona"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--green)] mt-2 hover:underline"
            >
              {t('carbon.biodiversity.learnMore')} <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>

      {/* FSC/PEFC Premium */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <ShieldCheck size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('carbon.biodiversity.certPremium')}
            </h3>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('carbon.biodiversity.certPremiumDesc')}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <EligibilityBadge
            eligible={eligibility.fscPremium}
            label={t('carbon.biodiversity.fscEligible')}
          />
          <EligibilityBadge
            eligible={eligibility.pefcPremium}
            label={t('carbon.biodiversity.pefcEligible')}
          />
        </div>

        <div className="mt-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <p className="text-xs text-[var(--text2)]">
            {t('carbon.biodiversity.certPremiumNote')}
          </p>
        </div>
      </div>

      {/* Set-aside Recommendation */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <TreePine size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('carbon.biodiversity.setAside')}
            </h3>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('carbon.biodiversity.setAsideDesc', {
                total: totalArea,
                recommended: eligibility.setAsideRecommendationHa,
              })}
            </p>
          </div>
        </div>

        {/* Revenue comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <div className="flex items-center gap-2 mb-1">
              <Leaf size={12} className="text-[var(--green)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {t('carbon.biodiversity.setAsideRevenue')}
              </span>
            </div>
            <p className="text-lg font-bold font-mono text-[var(--green)]">
              {formatSEK(eligibility.setAsideRevenueSek)}
            </p>
            <p className="text-[10px] text-[var(--text3)]">{t('carbon.biodiversity.perYear')}</p>
          </div>

          <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={12} className="text-[var(--text3)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {t('carbon.biodiversity.timberRevenue')}
              </span>
            </div>
            <p className="text-lg font-bold font-mono text-[var(--text2)]">
              {formatSEK(eligibility.timberRevenueSek)}
            </p>
            <p className="text-[10px] text-[var(--text3)]">{t('carbon.biodiversity.perYear')}</p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
          <AlertCircle size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[var(--green)]">
            {t('carbon.biodiversity.setAsideNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
