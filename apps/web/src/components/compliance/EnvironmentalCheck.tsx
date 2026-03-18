import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Ruler,
  CheckCircle2,
  XCircle,
  Clock,
  Bird,
  Droplets,
  Trees,
  Landmark,
} from 'lucide-react';
import type { EnvironmentalConstraint } from '@/hooks/useCompliance';
import { BUFFER_ZONE_RULES, type ConstraintSeverity } from '@/data/regulatoryRules';

interface EnvironmentalCheckProps {
  constraints: EnvironmentalConstraint[];
  parcelName?: string;
}

type CheckStatus = 'pass' | 'fail' | 'pending';

interface AssessmentItem {
  id: string;
  icon: typeof Trees;
  label_sv: string;
  label_en: string;
  description_sv: string;
  description_en: string;
  status: CheckStatus;
}

const SEVERITY_CONFIG: Record<ConstraintSeverity, { icon: typeof ShieldAlert; color: string; bg: string; label_sv: string; label_en: string }> = {
  red: {
    icon: ShieldAlert,
    color: '#ef4444',
    bg: '#ef444415',
    label_sv: 'Stopp / Kräver dispens',
    label_en: 'Blocked / Requires exemption',
  },
  yellow: {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg: '#fbbf2415',
    label_sv: 'Varning / Anpassning krävs',
    label_en: 'Warning / Adaptation required',
  },
  green: {
    icon: ShieldCheck,
    color: '#4ade80',
    bg: '#4ade8015',
    label_sv: 'OK / Inga hinder',
    label_en: 'OK / No obstacles',
  },
};

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; bg: string; label_sv: string; label_en: string }> = {
  pass: {
    icon: CheckCircle2,
    color: '#4ade80',
    bg: '#4ade8015',
    label_sv: 'Godkänd',
    label_en: 'Pass',
  },
  fail: {
    icon: XCircle,
    color: '#ef4444',
    bg: '#ef444415',
    label_sv: 'Underkänd',
    label_en: 'Fail',
  },
  pending: {
    icon: Clock,
    color: '#fbbf24',
    bg: '#fbbf2415',
    label_sv: 'Inväntar',
    label_en: 'Pending',
  },
};

/**
 * Check if current date falls within bird nesting season (March 1 - July 31).
 */
function isBirdNestingSeason(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  return month >= 2 && month <= 6; // March (2) through July (6)
}

export function EnvironmentalCheck({ constraints, parcelName }: EnvironmentalCheckProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const redCount = constraints.filter((c) => c.severity === 'red').length;
  const yellowCount = constraints.filter((c) => c.severity === 'yellow').length;
  const greenCount = constraints.filter((c) => c.severity === 'green').length;

  // Sort: red first, then yellow, then green
  const sorted = [...constraints].sort((a, b) => {
    const order: Record<ConstraintSeverity, number> = { red: 0, yellow: 1, green: 2 };
    return order[a.severity] - order[b.severity];
  });

  // Build assessment checklist items from constraints
  const assessmentItems: AssessmentItem[] = useMemo(() => {
    const hasNyckelbiotop = constraints.some((c) => c.type === 'nyckelbiotop');
    const nyckelbiotopRed = constraints.some((c) => c.type === 'nyckelbiotop' && c.severity === 'red');

    const hasWaterConstraint = constraints.some((c) => c.type === 'vattendrag' || c.type === 'riparian' || c.type === 'strandskydd');
    const waterRed = constraints.some((c) => (c.type === 'vattendrag' || c.type === 'riparian' || c.type === 'strandskydd') && c.severity === 'red');

    const hasCultural = constraints.some((c) => c.type === 'kulturminne');
    const culturalRed = constraints.some((c) => c.type === 'kulturminne' && c.severity === 'red');

    const nestingSeason = isBirdNestingSeason();

    return [
      {
        id: 'biotope',
        icon: Trees,
        label_sv: 'Nyckelbiotop i närheten',
        label_en: 'Key biotope (nyckelbiotop) nearby',
        description_sv: hasNyckelbiotop
          ? nyckelbiotopRed
            ? 'Nyckelbiotop identifierad inom skyddszonen. Avverkning bör undvikas eller dispens krävs.'
            : 'Nyckelbiotop finns i närheten men utanför skyddszon.'
          : 'Ingen nyckelbiotop hittad inom 500 m från skiftet.',
        description_en: hasNyckelbiotop
          ? nyckelbiotopRed
            ? 'Key biotope identified within buffer zone. Felling should be avoided or exemption required.'
            : 'Key biotope found nearby but outside buffer zone.'
          : 'No key biotope found within 500 m of the parcel.',
        status: hasNyckelbiotop ? (nyckelbiotopRed ? 'fail' : 'pending') : 'pass',
      },
      {
        id: 'water',
        icon: Droplets,
        label_sv: 'Vattenskyddszon',
        label_en: 'Water protection zone',
        description_sv: hasWaterConstraint
          ? waterRed
            ? 'Vattendrag eller sjö ligger inom obligatorisk skyddszon. Anpassning krävs.'
            : 'Vattendrag eller sjö finns i närheten. Kontrollera att skyddszon respekteras (min. 10–30 m).'
          : 'Inga vattendrag eller sjöar hittade inom 500 m.',
        description_en: hasWaterConstraint
          ? waterRed
            ? 'Watercourse or lake within mandatory buffer zone. Adaptation required.'
            : 'Watercourse or lake nearby. Verify buffer zone is respected (min. 10–30 m).'
          : 'No watercourses or lakes found within 500 m.',
        status: hasWaterConstraint ? (waterRed ? 'fail' : 'pending') : 'pass',
      },
      {
        id: 'nesting',
        icon: Bird,
        label_sv: 'Fågelhäckningstid (mars–juli)',
        label_en: 'Bird nesting season (March–July)',
        description_sv: nestingSeason
          ? 'Häckningsperiod pågår. Avverkning kan störa häckande fåglar. Anpassad tidplan rekommenderas.'
          : 'Utanför häckningsperioden. Inga begränsningar pga. fågelhäckning.',
        description_en: nestingSeason
          ? 'Nesting season is active. Felling may disturb nesting birds. Adapted schedule recommended.'
          : 'Outside nesting season. No restrictions due to bird nesting.',
        status: nestingSeason ? 'pending' : 'pass',
      },
      {
        id: 'cultural',
        icon: Landmark,
        label_sv: 'Kulturminnen & fornlämningar',
        label_en: 'Cultural heritage sites',
        description_sv: hasCultural
          ? culturalRed
            ? 'Fornlämning eller kulturminne inom skyddszon. Kontakt med Länsstyrelsen krävs.'
            : 'Kulturminne finns i närheten men på säkert avstånd.'
          : 'Inga kända kulturminnen eller fornlämningar inom 500 m.',
        description_en: hasCultural
          ? culturalRed
            ? 'Ancient monument or cultural heritage site within buffer zone. Contact County Board required.'
            : 'Cultural heritage site found nearby but at safe distance.'
          : 'No known cultural heritage sites or ancient monuments within 500 m.',
        status: hasCultural ? (culturalRed ? 'fail' : 'pending') : 'pass',
      },
    ];
  }, [constraints]);

  const passCount = assessmentItems.filter((i) => i.status === 'pass').length;
  const failCount = assessmentItems.filter((i) => i.status === 'fail').length;
  const pendingCount = assessmentItems.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('compliance.environmentalCheck.title')}
          </h3>
          {parcelName && (
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('compliance.environmentalCheck.radius', { name: parcelName })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {redCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: '#ef444415', color: '#ef4444' }}>
              {redCount} {lang === 'sv' ? 'stopp' : 'blocked'}
            </span>
          )}
          {yellowCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: '#fbbf2415', color: '#fbbf24' }}>
              {yellowCount} {lang === 'sv' ? 'varning' : 'warning'}
            </span>
          )}
          {greenCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: '#4ade8015', color: '#4ade80' }}>
              {greenCount} OK
            </span>
          )}
        </div>
      </div>

      {/* Assessment checklist */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between" style={{ background: 'var(--bg2)' }}>
          <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
            {lang === 'sv' ? 'Bedömning före avverkning' : 'Pre-felling assessment'}
          </span>
          <div className="flex items-center gap-2">
            {passCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#4ade8015', color: '#4ade80' }}>
                {passCount} {lang === 'sv' ? 'ok' : 'pass'}
              </span>
            )}
            {failCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#ef444415', color: '#ef4444' }}>
                {failCount} {lang === 'sv' ? 'stopp' : 'fail'}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#fbbf2415', color: '#fbbf24' }}>
                {pendingCount} {lang === 'sv' ? 'varning' : 'pending'}
              </span>
            )}
          </div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {assessmentItems.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status];
            const StatusIcon = statusCfg.icon;
            const ItemIcon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 px-3 py-2.5">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}
                >
                  <StatusIcon size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ItemIcon size={11} className="text-[var(--text3)] flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-[var(--text)]">
                      {lang === 'sv' ? item.label_sv : item.label_en}
                    </span>
                    <span
                      className="text-[8px] font-mono px-1 py-0.5 rounded flex-shrink-0 ml-auto"
                      style={{ background: statusCfg.bg, color: statusCfg.color }}
                    >
                      {lang === 'sv' ? statusCfg.label_sv : statusCfg.label_en}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5 ml-[19px]">
                    {lang === 'sv' ? item.description_sv : item.description_en}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* No constraints */}
      {constraints.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5">
          <ShieldCheck size={20} className="text-[var(--green)]" />
          <div>
            <p className="text-sm font-medium text-[var(--green)]">
              {t('compliance.environmentalCheck.allClear')}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('compliance.environmentalCheck.allClearDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Constraint cards */}
      {sorted.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
            {lang === 'sv' ? 'Identifierade restriktioner' : 'Identified constraints'}
          </h4>
          {sorted.map((constraint) => {
            const config = SEVERITY_CONFIG[constraint.severity];
            const Icon = config.icon;
            const rule = BUFFER_ZONE_RULES.find((r) => r.type === constraint.type);

            return (
              <div
                key={constraint.id}
                className="rounded-lg border border-[var(--border)] p-3"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: config.bg, color: config.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-[var(--text)] truncate">
                        {rule ? (lang === 'sv' ? rule.label_sv : rule.label_en) : constraint.type}
                      </h4>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: config.bg, color: config.color }}
                      >
                        {lang === 'sv' ? config.label_sv : config.label_en}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text2)] mt-1 font-medium">
                      {constraint.name}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-1">
                      {lang === 'sv' ? constraint.description_sv : constraint.description_en}
                    </p>

                    {/* Distance + buffer info */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                        <MapPin size={10} />
                        <span>{t('compliance.environmentalCheck.distance')}: <strong className="text-[var(--text2)]">{constraint.distance_m} m</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                        <Ruler size={10} />
                        <span>{t('compliance.environmentalCheck.bufferRequired')}: <strong className="text-[var(--text2)]">{constraint.bufferRequired_m} m</strong></span>
                      </div>
                    </div>

                    {/* Legal reference + link */}
                    {rule && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-mono text-[var(--text3)]">
                          {rule.legalReference}
                        </span>
                        <a
                          href={rule.skogsstyrelsenUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[9px] text-[var(--green)] hover:underline"
                        >
                          Skogsstyrelsen <ExternalLink size={8} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
