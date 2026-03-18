import { useState, useMemo } from 'react';
import {
  Sparkles,
  TreePine,
  Banknote,
  Users,
  FileText,
  BarChart3,
  Droplets,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEcosystemServices } from '@/hooks/useEcosystemServices';
import { ServiceCard } from '@/components/ecosystem/ServiceCard';
import { TotalValueWaterfall } from '@/components/ecosystem/TotalValueWaterfall';
import { BuyerMatching } from '@/components/ecosystem/BuyerMatching';
import { PaymentForEcosystem } from '@/components/ecosystem/PaymentForEcosystem';

type Tab = 'overview' | 'services' | 'waterfall' | 'buyers' | 'contracts';

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  overview: <BarChart3 size={14} />,
  services: <Droplets size={14} />,
  waterfall: <TreePine size={14} />,
  buyers: <Users size={14} />,
  contracts: <FileText size={14} />,
};

export default function EcosystemServicesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedParcel, setSelectedParcel] = useState<string>('all');
  const summary = useEcosystemServices();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Oversikt' },
    { key: 'services', label: 'Tjanster' },
    { key: 'waterfall', label: 'Totalvarde' },
    { key: 'buyers', label: 'Kopare' },
    { key: 'contracts', label: 'PES-avtal' },
  ];

  // Filter by selected parcel
  const filteredAnalysis = useMemo(() => {
    if (selectedParcel === 'all') return summary.analyses;
    return summary.analyses.filter(a => a.parcelId === selectedParcel);
  }, [summary.analyses, selectedParcel]);

  const displayTotalEcosystem = filteredAnalysis.reduce((s, a) => s + a.totalEcosystemValueSEK, 0);
  const displayTotalTimber = filteredAnalysis.reduce((s, a) => s + a.timberValueSEK, 0);
  const displayTotalCarbon = filteredAnalysis.reduce((s, a) => s + a.carbonValueSEK, 0);
  const displayTotalForest = filteredAnalysis.reduce((s, a) => s + a.totalForestValueSEK, 0);

  // Aggregate services across selected parcels
  const aggregatedServices = useMemo(() => {
    const map = new Map<string, typeof filteredAnalysis[0]['services'][0]>();
    filteredAnalysis.forEach(a => {
      a.services.forEach(s => {
        const existing = map.get(s.id);
        if (existing) {
          map.set(s.id, {
            ...existing,
            quantity: existing.quantity + s.quantity,
            annualValueSEK: existing.annualValueSEK + s.annualValueSEK,
            outputDescription: s.outputDescription, // Use last parcel's description
          });
        } else {
          map.set(s.id, { ...s });
        }
      });
    });
    // Recalculate output descriptions for aggregated
    if (selectedParcel === 'all') {
      map.forEach((s, id) => {
        if (id === 'water') s.outputDescription = `${s.quantity.toLocaleString('sv-SE')} m\u00B3 vatten renat per ar`;
        else if (id === 'flood') s.outputDescription = `${s.quantity.toLocaleString('sv-SE')} m\u00B3 vatten kvarh\u00E5llet per ar`;
        else if (id === 'air') s.outputDescription = `${s.quantity} ton fororeningar absorberade per ar`;
        else if (id === 'pollination') s.outputDescription = `${s.quantity} ha jordbruksmark stods`;
        else if (id === 'carbon') s.outputDescription = `${s.quantity.toFixed(1)} ton CO\u2082 bundet per ar`;
        else if (id === 'recreation') s.outputDescription = `${s.quantity.toLocaleString('sv-SE')} besoksdagar per ar`;
        else if (id === 'erosion') s.outputDescription = `${s.quantity} ton jord skyddad per ar`;
      });
    }
    return Array.from(map.values());
  }, [filteredAnalysis, selectedParcel]);

  const monetizedCount = aggregatedServices.filter(s => s.status === 'monetized').length;
  const potentialCount = aggregatedServices.filter(s => s.status === 'potential').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Sparkles size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                Ekosystemtjanster Marknadsplats
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Kvantifiera, vardera och salj din skogs ekosystemtjanster — utover virke och kol
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={14} className="text-[var(--green)]" />
              <p className="text-[10px] text-[var(--text3)]">Totalt ekosystemvarde</p>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--green)]">
              {displayTotalEcosystem.toLocaleString('sv-SE')}
            </p>
            <p className="text-[10px] text-[var(--text3)]">SEK/ar (utover virke & kol)</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <TreePine size={14} className="text-[#92400e]" />
              <p className="text-[10px] text-[var(--text3)]">Total skogsvarde</p>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--text)]">
              {displayTotalForest.toLocaleString('sv-SE')}
            </p>
            <p className="text-[10px] text-[var(--text3)]">SEK/ar alla kallor</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[#38bdf8]" />
              <p className="text-[10px] text-[var(--text3)]">Aktiva PES-intakter</p>
            </div>
            <p className="text-xl font-bold font-mono text-[#38bdf8]">
              {summary.activePESRevenueSEK.toLocaleString('sv-SE')}
            </p>
            <p className="text-[10px] text-[var(--text3)]">SEK/ar fran avtal</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={14} className="text-[#818cf8]" />
              <p className="text-[10px] text-[var(--text3)]">Tjanster</p>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--text)]">
              {monetizedCount + potentialCount}
            </p>
            <p className="text-[10px] text-[var(--text3)]">
              {monetizedCount} aktiva, {potentialCount} potential
            </p>
          </div>
        </div>

        {/* Parcel filter */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          <span className="text-[10px] text-[var(--text3)] flex-shrink-0">Skifte:</span>
          <button
            onClick={() => setSelectedParcel('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 ${
              selectedParcel === 'all'
                ? 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]'
                : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
          >
            Alla ({summary.analyses.length})
          </button>
          {summary.analyses.map(a => (
            <button
              key={a.parcelId}
              onClick={() => setSelectedParcel(a.parcelId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 ${
                selectedParcel === a.parcelId
                  ? 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
              }`}
            >
              {a.parcelName} ({a.areaHa} ha)
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
              }`}
            >
              {TAB_ICONS[tab.key]}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick waterfall */}
            <TotalValueWaterfall summary={summary} />

            {/* Top services */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--text)]">Hogst varderade tjanster</h2>
                <button
                  onClick={() => setActiveTab('services')}
                  className="text-xs text-[var(--green)] hover:underline flex items-center gap-1"
                >
                  Visa alla
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aggregatedServices
                  .filter(s => s.id !== 'carbon')
                  .sort((a, b) => b.annualValueSEK - a.annualValueSEK)
                  .slice(0, 4)
                  .map(service => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
              </div>
            </div>

            {/* Revenue tracking summary */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Banknote size={16} className="text-[var(--green)]" />
                  Intaktsoversikt
                </h3>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className="text-xs text-[var(--green)] hover:underline flex items-center gap-1"
                >
                  Se PES-avtal
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                  <p className="text-[10px] text-[var(--text3)] mb-0.5">Virke</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {displayTotalTimber.toLocaleString('sv-SE')} <span className="text-[10px] font-normal text-[var(--text3)]">SEK/ar</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                  <p className="text-[10px] text-[var(--text3)] mb-0.5">Kollagring</p>
                  <p className="text-sm font-mono font-semibold text-[var(--green)]">
                    {displayTotalCarbon.toLocaleString('sv-SE')} <span className="text-[10px] font-normal text-[var(--text3)]">SEK/ar</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                  <p className="text-[10px] text-[var(--text3)] mb-0.5">Ekosystemtjanster</p>
                  <p className="text-sm font-mono font-semibold text-[#38bdf8]">
                    {displayTotalEcosystem.toLocaleString('sv-SE')} <span className="text-[10px] font-normal text-[var(--text3)]">SEK/ar</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Link to carbon page */}
            <Link
              to="/owner/carbon"
              className="flex items-center justify-between w-full p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
                  <TreePine size={16} className="text-[var(--green)]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">Kollagring — detaljerad vy</p>
                  <p className="text-[10px] text-[var(--text3)]">Se fullstandig kolanalys och certifieringsmojligheter</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--text3)]" />
            </Link>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text2)] mb-2">
              7 ekosystemtjanster kvantifierade for{' '}
              {selectedParcel === 'all'
                ? `alla ${summary.analyses.length} skiften`
                : filteredAnalysis[0]?.parcelName ?? 'valt skifte'}{' '}
              ({filteredAnalysis.reduce((s, a) => s + a.areaHa, 0).toFixed(1)} ha totalt)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aggregatedServices
                .sort((a, b) => b.annualValueSEK - a.annualValueSEK)
                .map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
            </div>
          </div>
        )}

        {activeTab === 'waterfall' && (
          <TotalValueWaterfall summary={summary} />
        )}

        {activeTab === 'buyers' && (
          <BuyerMatching buyers={summary.allBuyers} />
        )}

        {activeTab === 'contracts' && (
          <PaymentForEcosystem summary={summary} />
        )}
      </div>
    </div>
  );
}
