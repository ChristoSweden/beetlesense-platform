import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bug, MapPin, AlertTriangle, Thermometer, Wind, Filter } from 'lucide-react';

interface PestReport {
  id: string;
  species: string;
  location: string;
  county: string;
  lat: number;
  lng: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  date: string;
  reporter: string;
  verified: boolean;
  description: string;
}

const DEMO_REPORTS: PestReport[] = [
  { id: '1', species: 'Ips typographus', location: 'Norra Skiftet', county: 'Kronoberg', lat: 57.19, lng: 14.05, severity: 'high', date: '2026-04-05', reporter: 'Skogsstyrelsen', verified: true, description: 'Bore dust found on 4 spruce trunks along south-facing edge. Gallery patterns confirmed.' },
  { id: '2', species: 'Ips typographus', location: 'Lessebo kommun', county: 'Kronoberg', lat: 56.75, lng: 15.27, severity: 'moderate', date: '2026-04-03', reporter: 'Erik Lindgren', verified: true, description: 'Pheromone trap catch rate increasing. 42 beetles/week.' },
  { id: '3', species: 'Hylobius abietis', location: 'Alvesta', county: 'Kronoberg', lat: 56.90, lng: 14.55, severity: 'low', date: '2026-03-28', reporter: 'Anna Svensson', verified: false, description: 'Pine weevil damage on newly planted seedlings. ~15% affected.' },
  { id: '4', species: 'Ips typographus', location: 'Vaxjo kommun', county: 'Kronoberg', lat: 56.88, lng: 14.81, severity: 'critical', date: '2026-04-06', reporter: 'Skogsstyrelsen', verified: true, description: 'Mass swarming detected. Degree-days exceeded 600. Immediate action required in affected stands.' },
  { id: '5', species: 'Heterobasidion annosum', location: 'Tingsryd', county: 'Kronoberg', lat: 56.52, lng: 14.98, severity: 'moderate', date: '2026-03-20', reporter: 'Lars Karlsson', verified: true, description: 'Root rot detected during thinning. Stumps treated with Rotstop.' },
];

const SEVERITY_CONFIG = {
  low: { label: 'Low', color: '#22c55e', bg: '#f0fdf4' },
  moderate: { label: 'Moderate', color: '#f59e0b', bg: '#fffbeb' },
  high: { label: 'High', color: '#f97316', bg: '#fff7ed' },
  critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2' },
};

export default function PestMapPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let reports = [...DEMO_REPORTS];
    if (severityFilter !== 'all') reports = reports.filter(r => r.severity === severityFilter);
    if (speciesFilter !== 'all') reports = reports.filter(r => r.species === speciesFilter);
    return reports.sort((a, b) => b.date.localeCompare(a.date));
  }, [severityFilter, speciesFilter]);

  const species = [...new Set(DEMO_REPORTS.map(r => r.species))];
  const criticalCount = DEMO_REPORTS.filter(r => r.severity === 'critical' || r.severity === 'high').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/10">
              <Bug size={18} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Pest Map</h1>
              <p className="text-[11px] text-[var(--text3)]">Regional pest reports and alerts</p>
            </div>
          </div>
        </div>

        {/* Summary banner */}
        {criticalCount > 0 && (
          <div className="rounded-xl p-4 mb-5 border border-red-200" style={{ background: '#fef2f2' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-semibold text-red-800">{criticalCount} high/critical reports nearby</span>
            </div>
            <p className="text-xs text-red-600">Active bark beetle activity detected in your region. Monitor your spruce stands closely.</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs" style={{ background: 'var(--bg2)' }}>
            <Filter size={12} className="text-[var(--text3)]" />
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-transparent text-[var(--text)] text-xs outline-none"
            >
              <option value="all">All severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs" style={{ background: 'var(--bg2)' }}>
            <select
              value={speciesFilter}
              onChange={e => setSpeciesFilter(e.target.value)}
              className="bg-transparent text-[var(--text)] text-xs outline-none"
            >
              <option value="all">All species</option>
              {species.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Regional conditions */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Thermometer size={14} className="text-[var(--text3)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Degree-days</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>487</p>
            <p className="text-[10px] text-[var(--text3)]">Swarming threshold: 500</p>
          </div>
          <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Wind size={14} className="text-[var(--text3)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Regional risk</span>
            </div>
            <p className="text-2xl font-bold text-orange-600" style={{ fontFamily: "'DM Mono', monospace" }}>0.67</p>
            <p className="text-[10px] text-[var(--text3)]">Above average (0.50)</p>
          </div>
        </div>

        {/* Reports list */}
        <h2 className="text-[10px] font-black text-[var(--text3)] uppercase tracking-[0.2em] mb-3">Reports ({filtered.length})</h2>
        <div className="space-y-3">
          {filtered.map(report => {
            const sev = SEVERITY_CONFIG[report.severity];
            return (
              <div
                key={report.id}
                className="rounded-xl p-4 border border-[var(--border)] hover-lift-premium"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ color: sev.color, background: sev.bg }}
                    >
                      {sev.label}
                    </span>
                    {report.verified && (
                      <span className="text-[10px] text-[var(--green)] font-medium">Verified</span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text3)]">{report.date}</span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{report.species}</h3>
                <div className="flex items-center gap-1 mb-2">
                  <MapPin size={11} className="text-[var(--text3)]" />
                  <span className="text-xs text-[var(--text2)]">{report.location}, {report.county}</span>
                </div>
                <p className="text-xs text-[var(--text3)] leading-relaxed">{report.description}</p>
                <p className="text-[10px] text-[var(--text3)] mt-2">Reported by {report.reporter}</p>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center mt-6 italic">
          Demo data for illustration. In production, reports come from Skogsstyrelsen, field observations, and community submissions.
        </p>
      </div>
    </div>
  );
}
