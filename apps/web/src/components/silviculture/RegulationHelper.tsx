/**
 * RegulationHelper — Swedish forestry regulation quick-reference.
 *
 * Shows relevant regulations per strategy, legal requirements,
 * PEFC/FSC implications, and links to Skogsstyrelsen.
 */

import { useState } from 'react';
import {
  Scale,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { StrategyId, Strategy, RegulationItem } from '@/hooks/useSilviculture';

interface Props {
  regulations: RegulationItem[];
  strategies: Strategy[];
  selectedStrategy: StrategyId;
}

const SEVERITY_CONFIG = {
  required: { label: 'Required', labelSv: 'Obligatorisk', color: 'var(--red)', icon: AlertTriangle },
  warning: { label: 'Warning', labelSv: 'Varning', color: 'var(--yellow)', icon: AlertTriangle },
  info: { label: 'Info', labelSv: 'Information', color: 'var(--green)', icon: Info },
};

interface LegalCheck {
  action: string;
  actionSv: string;
  isLegal: boolean | 'conditional';
  note: string;
  noteSv: string;
}

const LEGAL_CHECKS: Record<StrategyId, LegalCheck[]> = {
  clearcut: [
    { action: 'Clearcut > 0.5 ha', actionSv: 'Slutavverkning > 0,5 ha', isLegal: 'conditional', note: 'Legal with 6-week notification to Skogsstyrelsen', noteSv: 'Lagligt med 6 veckors anmalan till Skogsstyrelsen' },
    { action: 'Clearcut in nyckelbiotop', actionSv: 'Slutavverkning i nyckelbiotop', isLegal: false, note: 'Not permitted in identified key habitats', noteSv: 'Ej tillatet i identifierade nyckelbiotoper' },
    { action: 'Clearcut near watercourse', actionSv: 'Slutavverkning nara vattendrag', isLegal: 'conditional', note: 'Requires 5-30m buffer zone (kantzon)', noteSv: 'Kraver 5-30m skyddszon (kantzon)' },
    { action: 'Skip replanting', actionSv: 'Skippa aterplantering', isLegal: false, note: 'Regeneration required within 3 years after clearcut', noteSv: 'Foryngring kravs inom 3 ar efter slutavverkning' },
  ],
  ccf: [
    { action: 'Selective harvest', actionSv: 'Plockhuggning', isLegal: true, note: 'Generally permitted, notification required if > 0.5 ha', noteSv: 'Generellt tillatet, anmalan kravs om > 0,5 ha' },
    { action: 'CCF in nyckelbiotop', actionSv: 'Hyggesfritt i nyckelbiotop', isLegal: 'conditional', note: 'Often compatible if preserving key habitat values', noteSv: 'Ofta kompatibelt om nyckelbiotopvarden bevaras' },
    { action: 'No replanting obligation', actionSv: 'Ingen aterplanteringsplikt', isLegal: true, note: 'Natural regeneration in gaps satisfies the law', noteSv: 'Naturlig foryngring i luckor uppfyller lagen' },
    { action: 'Skip forest management plan', actionSv: 'Skippa skogsbruksplan', isLegal: true, note: 'Not legally required but strongly recommended', noteSv: 'Inte lagkrav men starkt rekommenderat' },
  ],
  extended: [
    { action: 'Delay harvest beyond 80 years', actionSv: 'Forsena avverkning bortom 80 ar', isLegal: true, note: 'No maximum rotation age in Swedish law', noteSv: 'Ingen maximal omloppstid i svensk lag' },
    { action: 'Thinning in mature stand', actionSv: 'Gallring i mogna bestand', isLegal: true, note: 'Permitted at any age, notification if > 0.5 ha', noteSv: 'Tillatet i alla aldrar, anmalan om > 0,5 ha' },
    { action: 'Extended rotation near protected area', actionSv: 'Forlangd rotation nara skyddat omrade', isLegal: true, note: 'Beneficial for Natura 2000 buffer zones', noteSv: 'Fordelaktigt for Natura 2000 buffertzoner' },
  ],
  conservation: [
    { action: 'Set aside for conservation', actionSv: 'Avsattning for naturvard', isLegal: true, note: 'Voluntary, may qualify for naturvardsstod', noteSv: 'Frivilligt, kan kvalificera for naturvardsstod' },
    { action: 'Apply for LONA-bidrag', actionSv: 'Ansok om LONA-bidrag', isLegal: true, note: 'Local nature conservation subsidy from Naturvardsverket', noteSv: 'Lokalt naturvardsbidrag fran Naturvardsverket' },
    { action: 'Create dead wood structures', actionSv: 'Skapa dod ved-strukturer', isLegal: true, note: 'Encouraged by both PEFC and FSC standards', noteSv: 'Uppmanad av bade PEFC och FSC standarder' },
    { action: 'Sell carbon credits', actionSv: 'Salj kolkrediter', isLegal: true, note: 'Legal in voluntary market (Gold Standard, Verra)', noteSv: 'Lagligt pa frivilliga marknaden (Gold Standard, Verra)' },
    { action: 'Minimal harvest in conservation area', actionSv: 'Minimal avverkning i naturvardsomrade', isLegal: 'conditional', note: 'Depends on conservation agreement terms', noteSv: 'Beror pa naturvardsavtalets villkor' },
  ],
};

export function RegulationHelper({ regulations, strategies, selectedStrategy }: Props) {
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const strat = strategies.find(s => s.id === selectedStrategy)!;
  const applicableRegs = regulations.filter(r =>
    r.applicableStrategies.includes(selectedStrategy) &&
    (searchQuery === '' ||
      r.titleSv.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.descriptionSv.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const legalChecks = LEGAL_CHECKS[selectedStrategy] ?? [];

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Scale size={16} className="text-[var(--green)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Regulation Helper</h2>
      </div>
      <p className="text-[10px] text-[var(--text3)] mb-4">
        Swedish forestry regulations for {strat.nameSv}
      </p>

      {/* Legal quick-checker */}
      <div className="mb-4">
        <p className="text-[10px] font-medium text-[var(--text2)] mb-2">
          Ar det lagligt? — Quick Checker ({strat.shortName})
        </p>
        <div className="space-y-1.5">
          {legalChecks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg3)]"
            >
              {check.isLegal === true && (
                <CheckCircle2 size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              )}
              {check.isLegal === false && (
                <AlertTriangle size={14} className="text-[var(--red)] mt-0.5 flex-shrink-0" />
              )}
              {check.isLegal === 'conditional' && (
                <AlertTriangle size={14} className="text-[var(--yellow)] mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[var(--text)]">{check.actionSv}</p>
                <p className="text-[9px] text-[var(--text3)]">{check.noteSv}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Sok regelverk..."
          className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-[10px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
        />
      </div>

      {/* Regulations list */}
      <div className="space-y-2">
        {applicableRegs.map(reg => {
          const severity = SEVERITY_CONFIG[reg.severity];
          const SeverityIcon = severity.icon;
          const isExpanded = expandedReg === reg.id;

          return (
            <div key={reg.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setExpandedReg(isExpanded ? null : reg.id)}
                className="flex items-start gap-2 w-full p-2.5 text-left hover:bg-[var(--bg3)] transition-colors"
              >
                <SeverityIcon size={13} style={{ color: severity.color }} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium text-[var(--text)]">{reg.titleSv}</p>
                    <span
                      className="text-[8px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${severity.color}15`,
                        color: severity.color,
                      }}
                    >
                      {severity.labelSv}
                    </span>
                  </div>
                  <p className="text-[9px] text-[var(--text3)] mt-0.5">{reg.title}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp size={12} className="text-[var(--text3)] mt-0.5" />
                ) : (
                  <ChevronDown size={12} className="text-[var(--text3)] mt-0.5" />
                )}
              </button>

              {isExpanded && (
                <div className="px-2.5 pb-2.5 space-y-2">
                  <p className="text-[10px] text-[var(--text2)]">{reg.descriptionSv}</p>
                  <div className="flex items-center gap-2 text-[9px] text-[var(--text3)]">
                    <span>Ref: {reg.legalReference}</span>
                    <a
                      href={reg.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[var(--green)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Skogsstyrelsen <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Certification overview */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <p className="text-[10px] font-medium text-[var(--text2)] mb-2">Certification Compatibility</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-[var(--bg3)]">
            <p className="text-[10px] font-semibold text-[var(--text)]">PEFC</p>
            <p className="text-[9px] text-[var(--text3)]">
              {selectedStrategy === 'clearcut'
                ? 'Compatible with stricter buffer rules'
                : selectedStrategy === 'ccf'
                ? 'Highly compatible, exceeds standards'
                : selectedStrategy === 'extended'
                ? 'Compatible, meets conservation targets'
                : 'Exceeds all PEFC requirements'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg3)]">
            <p className="text-[10px] font-semibold text-[var(--text)]">FSC</p>
            <p className="text-[9px] text-[var(--text3)]">
              {selectedStrategy === 'clearcut'
                ? 'Requires 5% strict reserves + 5% managed conservation'
                : selectedStrategy === 'ccf'
                ? 'Naturally aligns with FSC principles'
                : selectedStrategy === 'extended'
                ? 'Compatible, contributes to conservation %'
                : 'Perfect FSC alignment, premium certification'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
