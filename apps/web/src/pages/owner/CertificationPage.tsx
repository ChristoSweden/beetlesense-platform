import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Award,
  BarChart3,
  Calculator,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useCertification, type CertificationId } from '@/hooks/useCertification';
import { CertificationCard } from '@/components/certification/CertificationCard';
import { GapAnalysis } from '@/components/certification/GapAnalysis';
import { PremiumCalculator } from '@/components/certification/PremiumCalculator';

type View = 'overview' | 'gap-analysis' | 'calculator';

export default function CertificationPage() {
  const { t: _t, i18n } = useTranslation();
  const lang = i18n.language;
  const {
    certifications,
    selectedCertification: _selectedCertification,
    selectedCertId: _selectedCertId,
    setSelectedCertId,
    getGapCount: _getGapCount,
    getMetCount: _getMetCount,
  } = useCertification();

  const [view, setView] = useState<View>('overview');
  const [gapCertId, setGapCertId] = useState<CertificationId | null>(null);

  const handleShowGapAnalysis = (id: CertificationId) => {
    setGapCertId(id);
    setView('gap-analysis');
  };

  const handleBackFromGap = () => {
    setGapCertId(null);
    setView('overview');
  };

  const gapCert = certifications.find((c) => c.id === gapCertId);

  // Summary stats
  const totalCerts = certifications.length;
  const certifiedCount = certifications.filter((c) => c.status === 'certifierad').length;
  const inProgressCount = certifications.filter((c) => c.status === 'pagaende').length;
  const avgCompliance = Math.round(
    certifications.reduce((sum, c) => sum + c.compliancePct, 0) / totalCerts,
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck size={22} className="text-[var(--green)]" />
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {lang === 'sv' ? 'Certifieringar' : 'Certifications'}
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              {lang === 'sv'
                ? 'Valj din certifiering fritt — FSC, PEFC, EU Taxonomi eller Bra Miljoval. Vi later dig valja, inte bolaget.'
                : 'Choose your certification freely — FSC, PEFC, EU Taxonomy or Good Environmental Choice. We let you choose, not the company.'}
            </p>
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg3)] rounded-lg p-0.5">
            <button
              onClick={() => { setView('overview'); setGapCertId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === 'overview' || view === 'gap-analysis'
                  ? 'bg-[var(--bg2)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <Award size={13} />
              {lang === 'sv' ? 'Oversikt' : 'Overview'}
            </button>
            <button
              onClick={() => setView('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === 'calculator'
                  ? 'bg-[var(--bg2)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <Calculator size={13} />
              {lang === 'sv' ? 'Premieberaknare' : 'Premium Calculator'}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {view !== 'gap-analysis' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-[var(--green)]" />
                <span className="text-[10px] text-[var(--text3)]">
                  {lang === 'sv' ? 'Certifierade' : 'Certified'}
                </span>
              </div>
              <p className="text-2xl font-mono font-bold text-[var(--green)]">
                {certifiedCount} <span className="text-sm font-normal text-[var(--text3)]">/ {totalCerts}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-amber-400" />
                <span className="text-[10px] text-[var(--text3)]">
                  {lang === 'sv' ? 'Pagaende' : 'In Progress'}
                </span>
              </div>
              <p className="text-2xl font-mono font-bold text-amber-400">{inProgressCount}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-[var(--text2)]" />
                <span className="text-[10px] text-[var(--text3)]">
                  {lang === 'sv' ? 'Genomsnittlig compliance' : 'Avg. Compliance'}
                </span>
              </div>
              <p className="text-2xl font-mono font-bold text-[var(--text)]">{avgCompliance}%</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-[10px] text-[var(--text3)]">
                  {lang === 'sv' ? 'Mojlig premie' : 'Potential Premium'}
                </span>
              </div>
              <p className="text-2xl font-mono font-bold text-emerald-400">+5-15%</p>
            </div>
          </div>
        )}

        {/* Compliance Roadmap Banner */}
        {view === 'overview' && (
          <div
            className="rounded-xl border border-[var(--green)]/20 p-4 mb-6 flex items-center justify-between"
            style={{ background: 'rgba(74, 222, 128, 0.05)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
                <TrendingUp size={18} className="text-[var(--green)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {lang === 'sv' ? 'Certifieringsplan' : 'Certification Roadmap'}
                </h3>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  {lang === 'sv'
                    ? 'PEFC ar narmast certifiering (78%). Fokusera pa 3 aterstående krav for att uppna full compliance.'
                    : 'PEFC is closest to certification (78%). Focus on 3 remaining requirements to achieve full compliance.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleShowGapAnalysis('pefc')}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--green)] text-forest-950 text-[11px] font-semibold hover:brightness-110 transition-all flex-shrink-0"
            >
              {lang === 'sv' ? 'Se PEFC-plan' : 'View PEFC Plan'}
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Main content */}
        {view === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {certifications.map((cert) => (
              <CertificationCard
                key={cert.id}
                cert={cert}
                lang={lang}
                onSelect={(id) => {
                  setSelectedCertId(id);
                  handleShowGapAnalysis(id);
                }}
                onShowGapAnalysis={handleShowGapAnalysis}
              />
            ))}
          </div>
        )}

        {view === 'gap-analysis' && gapCert && (
          <GapAnalysis
            cert={gapCert}
            lang={lang}
            onBack={handleBackFromGap}
          />
        )}

        {view === 'calculator' && (
          <PremiumCalculator lang={lang} />
        )}
      </div>
    </div>
  );
}
