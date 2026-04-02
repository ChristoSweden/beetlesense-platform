import { Link } from 'react-router-dom';

const FEATURES = [
  { path: '/owner/green-attack-predictor', title: 'Green Attack Predictor', desc: 'Degree-day based swarming window prediction with Sentinel-2 NDVI tracking', icon: '🌡️', category: 'Prediction', status: 'live' },
  { path: '/owner/carbon-impact', title: 'Carbon Impact Calculator', desc: 'CO₂ vs timber trade-off analysis with EU ETS carbon credit pricing', icon: '🌱', category: 'Economics', status: 'live' },
  { path: '/owner/forester-network', title: 'Forester Network', desc: 'Crowdsourced ground truth community with credibility badges', icon: '🧑‍🌾', category: 'Community', status: 'live' },
  { path: '/owner/regional-heat-map', title: 'Regional Heat Map', desc: 'County-level susceptibility visualization with multi-factor risk scoring', icon: '🗺️', category: 'Monitoring', status: 'live' },
  { path: '/owner/harvest-optimizer', title: 'Harvest Optimizer', desc: 'AI-optimized multi-stand sequencing balancing timber, carbon, and risk', icon: '🪨', category: 'Operations', status: 'live' },
  { path: '/owner/climate-playbook', title: 'Climate Playbook', desc: '10-year adaptation plan based on SMHI projections and SLU research', icon: '📖', category: 'Strategy', status: 'live' },
  { path: '/owner/insurance-recommender', title: 'Insurance Recommender', desc: 'Risk-based premium comparison across Swedish forest insurers', icon: '🛡️', category: 'Economics', status: 'live' },
  { path: '/owner/drone-verification', title: 'Drone Verification', desc: 'Satellite→Drone→AI verification pipeline for anomaly confirmation', icon: '🛩️', category: 'Verification', status: 'live' },
  { path: '/owner/iot-sensors', title: 'IoT Sensor Network', desc: 'Real-time microclimate monitoring with LoRaWAN degree-day tracking', icon: '📡', category: 'Monitoring', status: 'live' },
  { path: '/owner/spectral-fingerprint', title: 'Spectral Fingerprint', desc: 'Bayesian multi-index anomaly classification with AI reasoning', icon: '🔬', category: 'Detection', status: 'live' },
];

const CATEGORIES = ['All', 'Prediction', 'Detection', 'Monitoring', 'Verification', 'Operations', 'Economics', 'Strategy', 'Community'];

import { useState } from 'react';

export default function OwnerDashboardPage() {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? FEATURES : FEATURES.filter(f => f.category === filter);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">B</div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--text)]">BeetleSense Command Center</h1>
              <p className="text-gray-500 text-sm">10 AI-powered tools no competitor has. Built for Swedish forest owners.</p>
            </div>
          </div>
          <p className="text-gray-600 mt-2">The world's most advanced bark beetle early warning platform. Combining satellite imagery, IoT sensors, drone verification, and AI prediction into a single decision-support system.</p>
        </div>

        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl p-6 text-white mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><div className="text-2xl font-bold">10</div><div className="text-sm opacity-80">AI Tools</div></div>
            <div><div className="text-2xl font-bold">334°d</div><div className="text-sm opacity-80">Swarming Threshold</div></div>
            <div><div className="text-2xl font-bold">10m</div><div className="text-sm opacity-80">Sentinel-2 Resolution</div></div>
            <div><div className="text-2xl font-bold">6h</div><div className="text-sm opacity-80">Update Cycle</div></div>
            <div><div className="text-2xl font-bold">0</div><div className="text-sm opacity-80">Competitors With This</div></div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === cat ? 'bg-green-700 text-white' : 'bg-[var(--bg2)] text-gray-600 border border-gray-300 hover:bg-[var(--bg)]'}`}>{cat}</button>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(feature => (
            <Link key={feature.path} to={feature.path} className="bg-[var(--bg2)] rounded-xl p-6 shadow-sm border border-[var(--border)] hover:shadow-lg hover:border-green-400 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{feature.icon}</span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold uppercase">{feature.status}</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text)] group-hover:text-green-700 transition-colors">{feature.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{feature.desc}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{feature.category}</span>
                <span className="text-green-600 text-sm font-medium group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Summit Banner */}
        <div className="mt-8 bg-gradient-to-r from-purple-700 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Forest Innovation Summit — Silicon Valley</h3>
              <p className="text-sm opacity-80">April 20, 2026 | Live demo of all 10 AI tools</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{Math.max(0, Math.ceil((new Date('2026-04-20').getTime() - Date.now()) / 86400000))} days</div>
              <div className="text-sm opacity-80">until demo day</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}