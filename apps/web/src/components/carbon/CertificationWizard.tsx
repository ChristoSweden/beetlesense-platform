import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  Clock,
  Banknote,
  Users,
  ExternalLink,
  Leaf,
} from 'lucide-react';
import {
  type CarbonParcel,
  type CertificationProgram,
  CERTIFICATION_PROGRAMS,
  SWEDISH_CERTIFIERS,
  SEK_PER_EUR,
  formatSEK,
} from '@/services/carbonService';

// ─── Step indicator ───

function StepIndicator({ currentStep, totalSteps, labels }: {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
      {labels.map((label, i) => {
        const step = i + 1;
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <div key={step} className="flex items-center gap-1 flex-shrink-0">
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all
              ${isCurrent ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30' : ''}
              ${isComplete ? 'text-[var(--green)]' : ''}
              ${!isCurrent && !isComplete ? 'text-[var(--text3)]' : ''}
            `}>
              {isComplete ? (
                <CheckCircle2 size={12} />
              ) : (
                <Circle size={12} className={isCurrent ? 'fill-[var(--green)]/20' : ''} />
              )}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {step < totalSteps && (
              <ChevronRight size={12} className="text-[var(--text3)] flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Eligibility ───

function EligibilityStep({ parcels }: { parcels: CarbonParcel[] }) {
  const { t } = useTranslation();
  const totalArea = parcels.reduce((s, p) => s + p.areaHa, 0);
  const avgAge = parcels.reduce((s, p) => s + p.ageYears, 0) / (parcels.length || 1);
  const minArea = 10;

  const checks = [
    {
      label: t('carbon.wizard.checkArea', { area: totalArea }),
      pass: totalArea >= minArea,
      detail: totalArea >= minArea
        ? t('carbon.wizard.checkAreaPass', { area: totalArea, min: minArea })
        : t('carbon.wizard.checkAreaFail', { area: totalArea, min: minArea }),
    },
    {
      label: t('carbon.wizard.checkAge'),
      pass: avgAge >= 10,
      detail: avgAge >= 10
        ? t('carbon.wizard.checkAgePass', { age: Math.round(avgAge) })
        : t('carbon.wizard.checkAgeFail', { age: Math.round(avgAge) }),
    },
    {
      label: t('carbon.wizard.checkMgmt'),
      pass: true,
      detail: t('carbon.wizard.checkMgmtDetail'),
    },
    {
      label: t('carbon.wizard.checkAdditionality'),
      pass: parcels.some((p) => p.ageYears <= 30),
      detail: t('carbon.wizard.checkAdditionalityDetail'),
    },
  ];

  const allPass = checks.every((c) => c.pass);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        {t('carbon.wizard.eligibilityTitle')}
      </h3>
      <p className="text-xs text-[var(--text3)]">
        {t('carbon.wizard.eligibilityDesc')}
      </p>

      <div className="space-y-3">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            {check.pass ? (
              <CheckCircle2 size={16} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-[#fbbf24] mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="text-xs font-medium text-[var(--text)]">{check.label}</p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-3 rounded-lg ${allPass ? 'bg-[var(--green)]/5 border border-[var(--green)]/20' : 'bg-[#fbbf24]/5 border border-[#fbbf24]/20'}`}>
        <p className={`text-xs font-medium ${allPass ? 'text-[var(--green)]' : 'text-[#fbbf24]'}`}>
          {allPass ? t('carbon.wizard.allChecksPass') : t('carbon.wizard.someChecksFail')}
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Program comparison ───

function ProgramComparisonStep({ onSelect, selected }: {
  onSelect: (p: CertificationProgram) => void;
  selected: CertificationProgram;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const programs: CertificationProgram[] = ['gold_standard', 'verra', 'plan_vivo'];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        {t('carbon.wizard.compareTitle')}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 text-[var(--text3)] font-medium">{t('carbon.wizard.feature')}</th>
              {programs.map((p) => (
                <th key={p} className="text-left py-2 px-3 text-[var(--text3)] font-medium">
                  {CERTIFICATION_PROGRAMS[p].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            <tr className="border-b border-[var(--border)]/50">
              <td className="py-2 pr-4 text-[var(--text3)]">{t('carbon.wizard.pricePerTon')}</td>
              {programs.map((p) => (
                <td key={p} className="py-2 px-3 font-mono text-[var(--green)]">
                  €{CERTIFICATION_PROGRAMS[p].priceEurPerTon}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--border)]/50">
              <td className="py-2 pr-4 text-[var(--text3)]">{t('carbon.wizard.certCost')}</td>
              {programs.map((p) => (
                <td key={p} className="py-2 px-3 font-mono">
                  {formatSEK(CERTIFICATION_PROGRAMS[p].certificationCost * SEK_PER_EUR)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--border)]/50">
              <td className="py-2 pr-4 text-[var(--text3)]">{t('carbon.wizard.annualCost')}</td>
              {programs.map((p) => (
                <td key={p} className="py-2 px-3 font-mono">
                  {formatSEK(CERTIFICATION_PROGRAMS[p].annualVerificationCost * SEK_PER_EUR)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--border)]/50">
              <td className="py-2 pr-4 text-[var(--text3)]">{t('carbon.wizard.timeline')}</td>
              {programs.map((p) => (
                <td key={p} className="py-2 px-3">
                  {CERTIFICATION_PROGRAMS[p].timelineMonths} {t('carbon.revenue.months')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--border)]/50">
              <td className="py-2 pr-4 text-[var(--text3)]">{t('carbon.wizard.minArea')}</td>
              {programs.map((p) => (
                <td key={p} className="py-2 px-3">{CERTIFICATION_PROGRAMS[p].minAreaHa} ha</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {programs.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className={`
              p-3 rounded-lg border text-left transition-all
              ${selected === p
                ? 'border-[var(--green)] bg-[var(--green)]/5 ring-1 ring-[var(--green)]/30'
                : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)]'
              }
            `}
          >
            <p className="text-xs font-semibold text-[var(--text)]">{CERTIFICATION_PROGRAMS[p].name}</p>
            <p className="text-[10px] text-[var(--text3)] mt-1">
              {lang === 'sv' ? CERTIFICATION_PROGRAMS[p].descriptionSv : CERTIFICATION_PROGRAMS[p].description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Documentation ───

function DocumentationStep() {
  const { t } = useTranslation();
  const docs = [
    { key: 'landOwnership', icon: <FileText size={14} /> },
    { key: 'managementPlan', icon: <FileText size={14} /> },
    { key: 'forestInventory', icon: <FileText size={14} /> },
    { key: 'baselineAssessment', icon: <FileText size={14} /> },
    { key: 'monitoringPlan', icon: <FileText size={14} /> },
    { key: 'stakeholderConsultation', icon: <Users size={14} /> },
    { key: 'environmentalImpact', icon: <Leaf size={14} /> },
  ];

  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleDoc = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        {t('carbon.wizard.docsTitle')}
      </h3>
      <p className="text-xs text-[var(--text3)]">
        {t('carbon.wizard.docsDesc')}
      </p>

      <div className="space-y-2">
        {docs.map((doc) => (
          <button
            key={doc.key}
            onClick={() => toggleDoc(doc.key)}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
              ${checked.has(doc.key)
                ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
                : 'border-[var(--border)] bg-[var(--bg)]'
              }
            `}
          >
            <div className={`
              w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all
              ${checked.has(doc.key)
                ? 'bg-[var(--green)] border-[var(--green)]'
                : 'border-[var(--border2)] bg-[var(--bg2)]'
              }
            `}>
              {checked.has(doc.key) && <CheckCircle2 size={12} className="text-[var(--bg)]" />}
            </div>
            <span className="text-[var(--text3)]">{doc.icon}</span>
            <div>
              <p className="text-xs font-medium text-[var(--text)]">
                {t(`carbon.wizard.doc_${doc.key}`)}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {t(`carbon.wizard.doc_${doc.key}_desc`)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
        <CheckCircle2 size={12} className="text-[var(--green)]" />
        <span>{checked.size}/{docs.length} {t('carbon.wizard.docsComplete')}</span>
      </div>
    </div>
  );
}

// ─── Step 4: Cost Estimate ───

function CostEstimateStep({ program }: { program: CertificationProgram }) {
  const { t } = useTranslation();
  const info = CERTIFICATION_PROGRAMS[program];

  const costs = [
    {
      label: t('carbon.wizard.costCertification'),
      amount: info.certificationCost * SEK_PER_EUR,
      type: 'one-time' as const,
    },
    {
      label: t('carbon.wizard.costVerification'),
      amount: info.annualVerificationCost * SEK_PER_EUR,
      type: 'annual' as const,
    },
    {
      label: t('carbon.wizard.costConsulting'),
      amount: 30000,
      type: 'one-time' as const,
    },
    {
      label: t('carbon.wizard.costMonitoring'),
      amount: 15000,
      type: 'annual' as const,
    },
  ];

  const oneTimeCosts = costs.filter((c) => c.type === 'one-time').reduce((s, c) => s + c.amount, 0);
  const annualCosts = costs.filter((c) => c.type === 'annual').reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        {t('carbon.wizard.costTitle')} — {info.name}
      </h3>

      <div className="space-y-2">
        {costs.map((cost, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
          >
            <div className="flex items-center gap-2">
              <Banknote size={14} className="text-[var(--text3)]" />
              <span className="text-xs text-[var(--text)]">{cost.label}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[var(--text)]">{formatSEK(cost.amount)}</span>
              <span className="text-[10px] text-[var(--text3)] ml-1">
                ({cost.type === 'one-time' ? t('carbon.wizard.oneTime') : t('carbon.wizard.annual')})
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
            {t('carbon.wizard.totalOneTime')}
          </p>
          <p className="text-lg font-bold font-mono text-[var(--text)]">{formatSEK(oneTimeCosts)}</p>
        </div>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
            {t('carbon.wizard.totalAnnual')}
          </p>
          <p className="text-lg font-bold font-mono text-[var(--text)]">{formatSEK(annualCosts)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
        <Clock size={14} className="text-[var(--text3)]" />
        <span className="text-xs text-[var(--text2)]">
          {t('carbon.wizard.timelineEstimate', { months: info.timelineMonths })}
        </span>
      </div>
    </div>
  );
}

// ─── Step 5: Connect with Certifier ───

function ConnectStep({ program }: { program: CertificationProgram }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const relevantCertifiers = SWEDISH_CERTIFIERS.filter((c) =>
    c.programs.includes(program),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">
        {t('carbon.wizard.connectTitle')}
      </h3>
      <p className="text-xs text-[var(--text3)]">
        {t('carbon.wizard.connectDesc')}
      </p>

      <div className="space-y-3">
        {relevantCertifiers.map((cert) => (
          <div
            key={cert.name}
            className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg2)]"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-semibold text-[var(--text)]">{cert.name}</h4>
              <a
                href={cert.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--green)] hover:text-[var(--green2)]"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-xs text-[var(--text3)] mb-2">
              {lang === 'sv' ? cert.descriptionSv : cert.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {cert.programs.map((p) => (
                <span
                  key={p}
                  className={`
                    text-[10px] px-2 py-0.5 rounded-full font-medium
                    ${p === program
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'bg-[var(--bg3)] text-[var(--text3)]'
                    }
                  `}
                >
                  {CERTIFICATION_PROGRAMS[p].name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
        <p className="text-xs text-[var(--green)] font-medium mb-1">
          {t('carbon.wizard.nextSteps')}
        </p>
        <p className="text-xs text-[var(--text3)]">
          {t('carbon.wizard.nextStepsDesc')}
        </p>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ───

interface CertificationWizardProps {
  parcels: CarbonParcel[];
}

export function CertificationWizard({ parcels }: CertificationWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedProgram, setSelectedProgram] = useState<CertificationProgram>('gold_standard');
  const totalSteps = 5;

  const stepLabels = [
    t('carbon.wizard.step1'),
    t('carbon.wizard.step2'),
    t('carbon.wizard.step3'),
    t('carbon.wizard.step4'),
    t('carbon.wizard.step5'),
  ];

  return (
    <div className="space-y-4">
      <StepIndicator currentStep={step} totalSteps={totalSteps} labels={stepLabels} />

      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        {step === 1 && <EligibilityStep parcels={parcels} />}
        {step === 2 && (
          <ProgramComparisonStep
            selected={selectedProgram}
            onSelect={setSelectedProgram}
          />
        )}
        {step === 3 && <DocumentationStep />}
        {step === 4 && <CostEstimateStep program={selectedProgram} />}
        {step === 5 && <ConnectStep program={selectedProgram} />}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          {t('common.back')}
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-[#030d05] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            {t('common.next')}
            <ChevronRight size={14} />
          </button>
        ) : (
          <a
            href="mailto:carbon@beetlesense.ai?subject=Carbon%20Credit%20Certification%20Inquiry"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-[#030d05] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            {t('carbon.wizard.contactUs')}
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
