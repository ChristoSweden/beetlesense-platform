/**
 * CompanionGuardrails.tsx — Response quality checks and confidence display.
 *
 * - Detects hallucinated statistics (unrealistic numbers)
 * - Flags potential regulatory contradictions
 * - Adds disclaimers for financial/legal advice
 * - Source confidence indicator based on RAG match quality
 * - "This answer is based on X research sources" badge
 */

import { useMemo } from 'react';
import { AlertTriangle, BookOpen, Scale, Shield } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

export interface GuardrailResult {
  warnings: GuardrailWarning[];
  disclaimers: string[];
  sourceCount: number;
  sourceConfidence: 'high' | 'medium' | 'low' | 'none';
}

export interface GuardrailWarning {
  type: 'hallucination' | 'regulatory' | 'financial' | 'legal';
  message: string;
  messageSv: string;
}

// ── Hallucination detection ─────────────────────────────────────────────────

/** Patterns that might indicate hallucinated or unrealistic statistics. */
const SUSPICIOUS_PATTERNS: Array<{
  pattern: RegExp;
  check: (match: RegExpMatchArray) => boolean;
  warning: GuardrailWarning;
}> = [
  {
    // Unrealistic timber prices (SEK/m3 should be roughly 200-1200)
    pattern: /(\d[\d\s]*)\s*SEK\s*\/\s*m[³3]/gi,
    check: (m) => {
      const val = parseInt(m[1].replace(/\s/g, ''), 10);
      return val > 2000 || val < 50;
    },
    warning: {
      type: 'hallucination',
      message: 'Timber price mentioned may be outside typical Swedish market range (200-1200 SEK/m³fub).',
      messageSv: 'Nämnt virkespris kan ligga utanför typiskt svenskt marknadsintervall (200-1200 SEK/m³fub).',
    },
  },
  {
    // Unrealistic hectare values (forest land rarely > 500k SEK/ha for timber)
    pattern: /(\d[\d\s]*)\s*(?:SEK|kr)\s*\/\s*h(?:ektar|a)\b/gi,
    check: (m) => {
      const val = parseInt(m[1].replace(/\s/g, ''), 10);
      return val > 500000;
    },
    warning: {
      type: 'hallucination',
      message: 'Per-hectare value appears unusually high. Verify with market data.',
      messageSv: 'Hektarvärdet verkar ovanligt högt. Verifiera med marknadsdata.',
    },
  },
  {
    // Unrealistic tree counts per hectare (typically 200-3000 for managed forests)
    pattern: /(\d[\d\s]*)\s*(?:träd|trees?)\s*(?:per|\/)\s*h(?:ektar|a)\b/gi,
    check: (m) => {
      const val = parseInt(m[1].replace(/\s/g, ''), 10);
      return val > 5000 || val < 10;
    },
    warning: {
      type: 'hallucination',
      message: 'Tree density mentioned seems outside typical range (200-3000 stems/ha).',
      messageSv: 'Nämnd trädtäthet verkar ligga utanför typiskt intervall (200-3000 stammar/ha).',
    },
  },
  {
    // Unrealistic NDVI (should be 0-1)
    pattern: /NDVI[:\s]+(\d+\.?\d*)/gi,
    check: (m) => {
      const val = parseFloat(m[1]);
      return val > 1.0 || val < -1.0;
    },
    warning: {
      type: 'hallucination',
      message: 'NDVI value should be between -1.0 and 1.0.',
      messageSv: 'NDVI-värdet bör ligga mellan -1.0 och 1.0.',
    },
  },
  {
    // Unrealistic volume per hectare (typically 50-600 m³sk/ha in Sweden)
    pattern: /(\d[\d\s]*)\s*m[³3]\s*(?:sk)?\s*\/\s*h(?:ektar|a)\b/gi,
    check: (m) => {
      const val = parseInt(m[1].replace(/\s/g, ''), 10);
      return val > 800;
    },
    warning: {
      type: 'hallucination',
      message: 'Standing volume per hectare seems unusually high (typical range: 50-600 m³sk/ha).',
      messageSv: 'Virkesförråd per hektar verkar ovanligt högt (typiskt intervall: 50-600 m³sk/ha).',
    },
  },
];

/** Patterns that indicate regulatory/legal content needing a disclaimer. */
const REGULATORY_KEYWORDS = [
  /skogsvårdslagen/i,
  /avverkningsanmälan/i,
  /biotopskydd/i,
  /natura\s*2000/i,
  /artskyddsförordningen/i,
  /felling\s+notification/i,
  /forestry\s+act/i,
  /habitat\s+protection/i,
  /nyckelbiotop/i,
  /EUDR/i,
  /EU\s+deforestation/i,
];

const FINANCIAL_KEYWORDS = [
  /skatt(?:e|everket)/i,
  /tax\b/i,
  /avdrag/i,
  /deduction/i,
  /moms/i,
  /VAT/i,
  /investering/i,
  /investment\b/i,
  /lönsamhet/i,
  /profitability/i,
  /ROI/i,
  /skogskon(?:to|t)/i,
  /forest\s+account/i,
];

// ── Analysis functions ──────────────────────────────────────────────────────

function detectHallucinations(content: string): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];
  const seen = new Set<string>();

  for (const { pattern, check, warning } of SUSPICIOUS_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      if (check(match) && !seen.has(warning.type + warning.message)) {
        warnings.push(warning);
        seen.add(warning.type + warning.message);
      }
    }
  }

  return warnings;
}

function detectDisclaimerNeeds(content: string): string[] {
  const disclaimers: string[] = [];

  const hasRegulatory = REGULATORY_KEYWORDS.some((p) => p.test(content));
  if (hasRegulatory) {
    disclaimers.push(
      'regulatory',
    );
  }

  const hasFinancial = FINANCIAL_KEYWORDS.some((p) => p.test(content));
  if (hasFinancial) {
    disclaimers.push(
      'financial',
    );
  }

  return disclaimers;
}

function computeSourceConfidence(
  sourceCount: number,
  confidence?: 'high' | 'medium' | 'low',
): 'high' | 'medium' | 'low' | 'none' {
  if (sourceCount === 0) return 'none';
  if (confidence) return confidence;
  if (sourceCount >= 3) return 'high';
  if (sourceCount >= 1) return 'medium';
  return 'low';
}

// ── Main analysis hook ──────────────────────────────────────────────────────

/**
 * Analyze a response for quality issues. Returns warnings, disclaimers, and confidence.
 */
export function analyzeResponse(
  content: string,
  sources: string[] = [],
  confidence?: 'high' | 'medium' | 'low',
): GuardrailResult {
  const warnings = detectHallucinations(content);
  const disclaimers = detectDisclaimerNeeds(content);
  const sourceCount = sources.length;
  const sourceConfidence = computeSourceConfidence(sourceCount, confidence);

  return { warnings, disclaimers, sourceCount, sourceConfidence };
}

// ── UI Components ───────────────────────────────────────────────────────────

interface SourceBadgeProps {
  sourceCount: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  lang: 'sv' | 'en';
}

export function SourceBadge({ sourceCount, confidence, lang }: SourceBadgeProps) {
  if (sourceCount === 0 && confidence === 'none') return null;

  const confidenceColors = {
    high: 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    low: 'text-red-400 bg-red-400/10 border-red-400/20',
    none: 'text-[var(--text3)] bg-[var(--bg3)] border-[var(--border)]',
  };

  const label =
    lang === 'sv'
      ? `Baserat på ${sourceCount} käll${sourceCount === 1 ? 'a' : 'or'}`
      : `Based on ${sourceCount} source${sourceCount === 1 ? '' : 's'}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border ${confidenceColors[confidence]}`}
    >
      <BookOpen size={9} aria-hidden="true" />
      {label}
    </span>
  );
}

interface GuardrailWarningsProps {
  result: GuardrailResult;
  lang: 'sv' | 'en';
}

export function GuardrailWarnings({ result, lang }: GuardrailWarningsProps) {
  const { warnings, disclaimers } = result;

  if (warnings.length === 0 && disclaimers.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Hallucination warnings */}
      {warnings.map((w, i) => (
        <div
          key={`warn-${i}`}
          className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/5 border border-amber-400/15 text-[10px] text-amber-400"
        >
          <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>{lang === 'sv' ? w.messageSv : w.message}</span>
        </div>
      ))}

      {/* Regulatory disclaimer */}
      {disclaimers.includes('regulatory') && (
        <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-400/5 border border-blue-400/15 text-[10px] text-blue-300">
          <Scale size={11} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {lang === 'sv'
              ? 'Detta är allmän vägledning, inte juridisk rådgivning. Kontakta Skogsstyrelsen för bindande besked.'
              : 'This is general guidance, not legal advice. Contact Skogsstyrelsen for binding decisions.'}
          </span>
        </div>
      )}

      {/* Financial disclaimer */}
      {disclaimers.includes('financial') && (
        <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-400/5 border border-purple-400/15 text-[10px] text-purple-300">
          <Shield size={11} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {lang === 'sv'
              ? 'Ekonomiska uppgifter är uppskattningar. Rådgör med skatterådgivare för bindande ekonomisk vägledning.'
              : 'Financial figures are estimates. Consult a tax advisor for binding financial guidance.'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Hook version for convenient use in components.
 */
export function useGuardrailAnalysis(
  content: string,
  sources: string[] = [],
  confidence?: 'high' | 'medium' | 'low',
): GuardrailResult {
  return useMemo(
    () => analyzeResponse(content, sources, confidence),
    [content, sources, confidence],
  );
}
