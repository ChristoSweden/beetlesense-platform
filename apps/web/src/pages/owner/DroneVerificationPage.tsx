import { useState } from 'react';

interface DroneMission {
  id: string; standName: string; status: 'pending' | 'scheduled' | 'in-flight' | 'processing' | 'verified' | 'rejected';
  satelliteDate: string; droneDate: string | null; pilot: string | null;
  area: number; anomalyType: string; confidence: number;
  satelliteIndex: string; droneFindings: string | null; images: number;
}

const DEMO_MISSIONS: DroneMission[] = [
  { id: 'm1', standName: 'Falun Nord A-3', status: 'verified', satelliteDate: '2026-03-22', droneDate: '2026-03-25', pilot: 'Erik Lindqvist', area: 2.3, anomalyType: 'Crown discoloration', confidence: 94, satelliteIndex: 'EVI drop -0.18', droneFindings: 'Confirmed: Ips typographus bore holes on 12 trees. Stage 2 infestation.', images: 48 },
  { id: 'm2', standName: 'Falun Nord B-1', status: 'processing', satelliteDate: '2026-03-24', droneDate: '2026-03-29', pilot: 'Anna Svensson', area: 1.8, anomalyType: 'NDVI anomaly cluster', confidence: 87, satelliteIndex: 'NDVI drop -0.12', droneFindings: null, images: 36 },
  { id: 'm3', standName: 'Sandviken S C-2', status: 'scheduled', satelliteDate: '2026-03-26', droneDate: null, pilot: 'Erik Lindqvist', area: 3.1, anomalyType: 'Moisture stress pattern', confidence: 72, satelliteIndex: 'GNDVI drop -0.09', droneFindings: null, images: 0 },
  { id: 'm4', standName: 'Gävleborg D-5', status: 'pending', satelliteDate: '2026-03-28', droneDate: null, pilot: null, area: 4.2, anomalyType: 'Spectral shift', confidence: 65, satelliteIndex: 'Red edge shift +0.04', droneFindings: null, images: 0 },
  { id: 'm5', standName: 'Karlstad V E-1', status: 'rejected', satelliteDate: '2026-03-20', droneDate: '2026-03-23', pilot: 'Anna Svensson', area: 1.5, anomalyType: 'Shadow artifact', confidence: 41, satelliteIndex: 'EVI drop -0.06', droneFindings: 'False positive: cloud shadow causing apparent NDVI drop. No infestation signs.', images: 24 },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Awaiting Assignment', icon: '⏳' },
  scheduled: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Drone Scheduled', icon: '📅' },
  'in-flight': { color: 'text-purple-600', bg: 'bg-purple-100', label: 'In Flight', icon: '✈️' },
  processing: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'AI Processing', icon: '🧠' },
  verified: { color: 'text-green-600', bg: 'bg-green-100', label: 'Verified', icon: '✅' },
  rejected: { color: 'text-red-600', bg: 'bg-red-100', label: 'False Positive', icon: '❌' },
};

export default function DroneVerificationPage() {
  const [missions] = useState<DroneMission[]>(DEMO_MISSIONS);
  const [selectedMission, setSelectedMission] = useState<DroneMission | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = filterStatus === 'all' ? missions : missions.filter(m => m.status === filterStatus);
  const verified = missions.filter(m => m.status === 'verified').length;
  const falsePositive = missions.filter(m => m.status === 'rejected').length;
  const accuracy = missions.length > 0 ? Math.round((verified / (verified + falsePositive || 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Drone Verification Workflow</h1>
          <p className="text-gray-600 dark:text-gray-400">Satellite → Drone → AI verification pipeline. Confirm anomalies detected by Sentinel-2 with high-resolution drone imagery.</p>
          <p className="text-xs text-gray-500 mt-1">Pipeline: Sentinel-2 anomaly detection → Mission assignment → DJI Mavic 3M flight → Multispectral AI analysis → Ground truth verification</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border"><div className="text-2xl font-bold">{missions.length}</div><div className="text-sm text-gray-500">Total Missions</div></div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200"><div className="text-2xl font-bold text-green-600">{verified}</div><div className="text-sm text-green-700">Verified</div></div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200"><div className="text-2xl font-bold text-red-600">{falsePositive}</div><div className="text-sm text-red-700">False Positives</div></div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200"><div className="text-2xl font-bold text-blue-600">{accuracy}%</div><div className="text-sm text-blue-700">Accuracy</div></div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200"><div className="text-2xl font-bold text-purple-600">{missions.reduce((s, m) => s + m.images, 0)}</div><div className="text-sm text-purple-700">Images Captured</div></div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'scheduled', 'in-flight', 'processing', 'verified', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filterStatus === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>{s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}</button>
          ))}
        </div>

        {/* Mission Cards */}
        <div className="space-y-4 mb-8">
          {filtered.map(mission => {
            const cfg = STATUS_CONFIG[mission.status];
            return (
              <button key={mission.id} onClick={() => setSelectedMission(mission)} className={`w-full text-left ${cfg.bg} rounded-xl p-5 border-2 border-transparent hover:border-blue-400 transition-all ${selectedMission?.id === mission.id ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{mission.standName}</h3>
                      <p className="text-sm text-gray-600">{mission.anomalyType} | {mission.area} ha</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">Satellite: {mission.satelliteDate}</div>
                      {mission.droneDate && <div className="text-sm text-gray-500">Drone: {mission.droneDate}</div>}
                    </div>
                    <span className={`${cfg.bg} ${cfg.color} px-3 py-1 rounded-full text-xs font-bold border`}>{cfg.label}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${mission.confidence > 80 ? 'bg-green-500' : mission.confidence > 60 ? 'bg-yellow-500' : 'bg-gray-400'}`} style={{ width: `${mission.confidence}%` }} /></div>
                  <span className="text-sm font-medium text-gray-700">{mission.confidence}% confidence</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selectedMission && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedMission.standName} — Mission Details</h2>
              <button onClick={() => setSelectedMission(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><div className="text-sm text-gray-500">Anomaly Type</div><div className="font-bold">{selectedMission.anomalyType}</div></div>
              <div><div className="text-sm text-gray-500">Satellite Index</div><div className="font-bold font-mono text-sm">{selectedMission.satelliteIndex}</div></div>
              <div><div className="text-sm text-gray-500">Pilot</div><div className="font-bold">{selectedMission.pilot || 'Unassigned'}</div></div>
              <div><div className="text-sm text-gray-500">Images</div><div className="font-bold">{selectedMission.images}</div></div>
            </div>
            {selectedMission.droneFindings && (
              <div className={`p-4 rounded-lg ${selectedMission.status === 'verified' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold mb-1 ${selectedMission.status === 'verified' ? 'text-green-800' : 'text-red-800'}`}>Drone Findings</h3>
                <p className={`text-sm ${selectedMission.status === 'verified' ? 'text-green-700' : 'text-red-700'}`}>{selectedMission.droneFindings}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}