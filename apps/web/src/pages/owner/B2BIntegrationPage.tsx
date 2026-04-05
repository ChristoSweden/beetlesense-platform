import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Settings, 
  RefreshCcw, 
  ExternalLink, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  ChevronRight,
  Database,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { b2bMock, B2BLog } from '@/services/b2bMock';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface Partner {
  id: string;
  name: string;
  description: string;
  type: 'government' | 'cooperative' | 'private';
  status: 'connected' | 'disconnected' | 'pending';
  logo: string;
}

const PARTNERS: Partner[] = [
  { id: 'sveaskog', name: 'Sveaskog', description: 'State-owned forestry company data pipeline. Bi-directional sync of parcel boundaries and harvest plans.', type: 'private', status: 'connected', logo: 'S' },
  { id: 'sodra', name: 'Södra', description: 'Forest owners association integration. Wood supply chain tracking and member dividend metrics.', type: 'cooperative', status: 'disconnected', logo: 'Söd' },
  { id: 'lantmateriet', name: 'Lantmäteriet', description: 'Swedish Mapping, Cadastral and Land Registration Authority. High-precision property boundary sync.', type: 'government', status: 'connected', logo: 'L' },
  { id: 'svefa', name: 'Svefa', description: 'Independent real estate consultancy. Real-time forest valuation and market transaction data.', type: 'private', status: 'disconnected', logo: 'Sf' },
];

export default function B2BIntegrationPage() {
  useDocumentTitle('B2B Integrations');
  const [partners, setPartners] = useState<Partner[]>(PARTNERS);
  const [logs, setLogs] = useState<B2BLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const refreshLogs = useCallback(() => {
    setLogs(b2bMock.getLogs());
  }, []);

  useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 5000);
    return () => clearInterval(interval);
  }, [refreshLogs]);

  const handleConnect = async (id: string) => {
    setIsSyncing(id);
    const success = await b2bMock.connectPartner(id);
    if (success) {
      setPartners(prev => prev.map(p => p.id === id ? { ...p, status: 'connected' } : p));
    }
    setIsSyncing(null);
    refreshLogs();
  };

  const handleTest = async (id: string) => {
    setIsSyncing(id);
    await b2bMock.testConnection(id);
    setIsSyncing(null);
    refreshLogs();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)' }}>
            Institutional B2B Pipelines
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Secure, bi-directional data exchange with Sweden's largest forestry actors. 
            Automate regulatory reporting and sync high-precision property data via dedicated API channels.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 shadow-sm">
          <ShieldCheck className="text-emerald-600" size={24} />
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-widest">ISO 27001 Compliant</div>
            <div className="text-[10px] text-emerald-600 font-medium">All data encrypted with AES-256</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Partner List ─── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 size={14} /> Available Hubs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partners.map(partner => (
              <div 
                key={partner.id}
                className="group relative bg-white border border-gray-100 rounded-3xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 overflow-hidden"
              >
                {/* Background Decoration */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-[var(--green)]/5 rounded-full blur-2xl group-hover:bg-[var(--green)]/10 transition-colors" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all duration-300">
                      {partner.logo}
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      partner.status === 'connected' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}>
                      {partner.status}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">{partner.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-6 flex-grow">{partner.description}</p>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                    {partner.status === 'connected' ? (
                      <button 
                        onClick={() => handleTest(partner.id)}
                        disabled={!!isSyncing}
                        className="flex-1 bg-white border border-gray-200 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                      >
                        {isSyncing === partner.id ? <RefreshCcw size={14} className="animate-spin" /> : <Activity size={14} />}
                        Test Line
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleConnect(partner.id)}
                        disabled={!!isSyncing}
                        className="flex-1 bg-[var(--green)] hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isSyncing === partner.id ? <RefreshCcw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        Establish Sink
                      </button>
                    )}
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Settings size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Real-time Activity Logs ─── */}
        <div className="lg:col-span-1 border-l border-gray-100 pl-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> Pipeline Logs
            </h2>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="py-12 text-center">
                <Database size={48} className="text-gray-100 mx-auto mb-4" />
                <p className="text-xs text-gray-400">No recent activity detected.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="relative pl-6 pb-4 border-l border-gray-100 last:border-0">
                  <div className="absolute left-[-5px] top-1 rounded-full bg-white border-2 border-gray-100 w-2.5 h-2.5" />
                  
                  <div className="bg-white border border-gray-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {log.partner}
                      </span>
                      <span className="text-[9px] text-gray-300 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                            <XCircle size={12} className="text-red-600" />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-gray-700 capitalize">{log.action}</span>
                      </div>
                      
                      <div className="hidden group-hover:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                          JSON <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Footer Details ─── */}
      <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Latency Target</h4>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">45</span>
              <span className="text-xs text-gray-400 font-medium mb-1">ms p99</span>
            </div>
            <p className="text-[10px] text-gray-500">Global edge network routing via Supabase Functions.</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Sovereignty</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-700">EU-NORTH-1</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-gray-500">All compute and storage localized in Stockholm region.</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contractual Guard</h4>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
               SLA 99.9% <Clock size={14} className="text-emerald-600" />
            </div>
            <p className="text-[10px] text-gray-500">Automated liability monitoring for B2B data parity.</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Regulatory Mode</h4>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
               EUDR-Compatible <ShieldCheck size={14} className="text-emerald-600" />
            </div>
            <p className="text-[10px] text-gray-500">Automated geolocation proof generation for all timber loads.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
