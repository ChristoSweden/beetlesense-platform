/**
 * CollateralCertificate — Bankable document preview with property details,
 * valuation breakdown, satellite verification, and PDF/bank export.
 */

import {
  Shield,
  Satellite,
  Leaf,
  QrCode,
  Download,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  TreePine,
} from 'lucide-react';
import type { CollateralCertificateData } from '@/hooks/useForestFinance';

function formatSEK(value: number): string {
  return value.toLocaleString('sv-SE');
}

interface Props {
  certificate: CollateralCertificateData;
}

export function CollateralCertificate({ certificate }: Props) {
  const c = certificate;
  const validDays = Math.ceil(
    (new Date(c.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6">
      {/* Certificate preview */}
      <div
        className="rounded-xl border-2 border-[var(--green)]/30 p-6 relative overflow-hidden"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <TreePine size={300} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-[var(--green)]" />
              <h2 className="text-lg font-serif font-bold text-[var(--text)]">
                Värderingsintyg / Collateral Certificate
              </h2>
            </div>
            <p className="text-[10px] text-[var(--text3)] font-mono">{c.certificateId}</p>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-lg border border-[var(--border)] bg-[var(--bg3)] flex items-center justify-center">
              <QrCode size={40} className="text-[var(--text3)]" />
            </div>
            <p className="text-[8px] text-[var(--text3)] mt-1">Skanna för verifiering</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-[var(--border)] my-4" />

        {/* Property details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div>
            <p className="text-[var(--text3)] mb-0.5">Fastighetsdesignation</p>
            <p className="font-medium text-[var(--text)]">{c.propertyDesignation}</p>
          </div>
          <div>
            <p className="text-[var(--text3)] mb-0.5">Fastighetsägare</p>
            <p className="font-medium text-[var(--text)]">{c.ownerName}</p>
          </div>
          <div>
            <p className="text-[var(--text3)] mb-0.5">Total areal</p>
            <p className="font-medium text-[var(--text)]">{c.totalAreaHa.toFixed(1)} hektar</p>
          </div>
          <div>
            <p className="text-[var(--text3)] mb-0.5">Antal skiften</p>
            <p className="font-medium text-[var(--text)]">{c.parcels.length} st</p>
          </div>
        </div>

        {/* Valuation */}
        <div className="rounded-lg border border-[var(--green)]/20 p-4 bg-[var(--green)]/5 mb-6">
          <p className="text-[10px] text-[var(--text3)] mb-1">Fastställt fastighetsvärde</p>
          <p className="text-3xl font-bold font-mono text-[var(--green)]">
            {formatSEK(c.totalValueSEK)} <span className="text-sm font-normal text-[var(--text2)]">SEK</span>
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            Konfidensintervall: &plusmn;{c.confidenceInterval}%
            ({formatSEK(Math.round(c.totalValueSEK * (1 - c.confidenceInterval / 100)))} &mdash; {formatSEK(Math.round(c.totalValueSEK * (1 + c.confidenceInterval / 100)))} SEK)
          </p>
        </div>

        {/* Breakdown table */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[var(--text)] mb-2">Värderingsfördelning</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-1.5 text-[var(--text3)] font-normal">Komponent</th>
                <th className="text-right py-1.5 text-[var(--text3)] font-normal">Andel</th>
                <th className="text-right py-1.5 text-[var(--text3)] font-normal">Värde (SEK)</th>
              </tr>
            </thead>
            <tbody>
              {c.breakdown.map((b) => (
                <tr key={b.category} className="border-b border-[var(--border)]/50">
                  <td className="py-1.5 text-[var(--text)]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
                      {b.label}
                    </div>
                  </td>
                  <td className="text-right py-1.5 font-mono text-[var(--text2)]">{b.percentage}%</td>
                  <td className="text-right py-1.5 font-mono text-[var(--text)]">{formatSEK(b.valueSEK)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 text-[var(--text)]">Totalt</td>
                <td className="text-right py-2 font-mono text-[var(--text)]">100%</td>
                <td className="text-right py-2 font-mono text-[var(--green)]">{formatSEK(c.totalValueSEK)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Methodology */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[var(--text)] mb-2">Metodik</h3>
          <p className="text-[10px] text-[var(--text2)] leading-relaxed">{c.methodology}</p>
        </div>

        {/* Certifications & Verifications */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <CertBadge
            icon={<Satellite size={14} />}
            label="Satellitverifierad"
            active={c.satelliteVerified}
          />
          <CertBadge
            icon={<Leaf size={14} />}
            label="Kolkreditcertifierad"
            active={c.carbonCertified}
          />
          <CertBadge
            icon={<TreePine size={14} />}
            label="FSC-certifierad"
            active={c.fscCertified}
          />
          <CertBadge
            icon={<TreePine size={14} />}
            label="PEFC-certifierad"
            active={c.pefcCertified}
          />
        </div>

        {/* Risk assessment */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[var(--text)] mb-2">Riskbedömning</h3>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                c.riskRating === 'low'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : c.riskRating === 'medium'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
              }`}
            >
              {c.riskRating === 'low' ? (
                <CheckCircle size={10} />
              ) : (
                <AlertTriangle size={10} />
              )}
              {c.riskRating === 'low' ? 'Låg risk' : c.riskRating === 'medium' ? 'Medel risk' : 'Hög risk'}
            </span>
          </div>
          <ul className="space-y-1">
            {c.riskFactors.map((rf, i) => (
              <li key={i} className="text-[10px] text-[var(--text3)] flex items-start gap-1.5">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-[var(--text3)] flex-shrink-0" />
                {rf}
              </li>
            ))}
          </ul>
        </div>

        {/* Validity */}
        <div className="border-t border-dashed border-[var(--border)] pt-4">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-[var(--text3)]">
              <Clock size={10} />
              Utfärdad: {new Date(c.valuationDate).toLocaleDateString('sv-SE')}
            </div>
            <div className="flex items-center gap-1 text-[var(--text3)]">
              <Clock size={10} />
              Giltig till: {new Date(c.validUntil).toLocaleDateString('sv-SE')} ({validDays} dagar kvar)
            </div>
          </div>
          <p className="text-[8px] text-[var(--text3)] mt-2 text-center">
            Verifiering: {c.verificationUrl}
          </p>
        </div>
      </div>

      {/* Per-parcel summary */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Skiftesvärdering</h3>
        <div className="space-y-2">
          {c.parcels.map((p) => (
            <div
              key={p.parcelId}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]/50"
            >
              <div>
                <p className="text-xs font-medium text-[var(--text)]">{p.parcelName}</p>
                <p className="text-[10px] text-[var(--text3)]">
                  {p.areaHa} ha &middot; {p.municipality} &middot; {p.timberVolumeM3.toLocaleString('sv-SE')} m&sup3;
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold text-[var(--text)]">
                  {formatSEK(p.totalValueSEK)} SEK
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  {formatSEK(p.perHectareSEK)} SEK/ha
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--green)] text-white font-medium text-sm hover:brightness-110 transition">
          <Download size={16} />
          Ladda ner PDF
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[var(--green)] text-[var(--green)] font-medium text-sm hover:bg-[var(--green)]/10 transition">
          <Send size={16} />
          Skicka till bank
        </button>
      </div>
    </div>
  );
}

// ─── Badge helper ───

function CertBadge({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${
        active
          ? 'border-[var(--green)]/30 bg-[var(--green)]/5 text-[var(--green)]'
          : 'border-[var(--border)] text-[var(--text3)]'
      }`}
    >
      {icon}
      <span className="text-[9px] leading-tight">{label}</span>
      {active ? (
        <CheckCircle size={10} className="text-[var(--green)]" />
      ) : (
        <span className="text-[8px]">Ej aktiv</span>
      )}
    </div>
  );
}
