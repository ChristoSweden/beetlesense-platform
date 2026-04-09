import type { ApiKey } from '@/services/apiHealthService';
import { useApiHealthStore } from '@/services/apiHealthService';
import { Cloud, Database, Satellite, Zap, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const SERVICE_META: Record<ApiKey, { label: string; icon: any }> = {
  smhi: { label: 'SMHI Weather', icon: Cloud },
  skogsstyrelsen: { label: 'Forestry Agency', icon: Database },
  supabase: { label: 'Cloud Sync', icon: Zap },
  copernicus: { label: 'Satellite Data', icon: Satellite },
};

export function ApiStatusPanel() {
  const { services } = useApiHealthStore();

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[45] lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
      <div className="glass-panel rounded-2xl p-3 shadow-2xl flex items-center gap-4 border border-white/10">
        <div className="flex items-center gap-3 px-2 border-r border-white/10 mr-1">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest hidden sm:inline">
            Live Stream
          </span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
          {(Object.entries(services) as [ApiKey, any][]).map(([key, data]) => {
            const Meta = SERVICE_META[key];
            const StatusIcon = data.status === 'online' ? CheckCircle2 : data.status === 'degraded' ? AlertCircle : XCircle;
            const statusColor = data.status === 'online' ? 'text-emerald-400' : data.status === 'degraded' ? 'text-amber-400' : 'text-red-400';
            
            return (
              <div key={key} className="flex items-center gap-2 group cursor-help transition-all hover:scale-105" title={`${Meta.label}: ${data.status} (${data.latency ? data.latency + 'ms' : 'N/A'})`}>
                <div className={`p-1.5 rounded-lg bg-white/5 border border-white/5 ${statusColor}`}>
                  <Meta.icon size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-tight leading-none mb-0.5 whitespace-nowrap">
                    {Meta.label}
                  </span>
                  <div className="flex items-center gap-1">
                     <StatusIcon size={8} className={statusColor} />
                     <span className={`text-[10px] font-mono leading-none ${statusColor}`}>
                       {data.status === 'online' ? (data.latency ? `${data.latency}ms` : 'OK') : data.status.toUpperCase()}
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
