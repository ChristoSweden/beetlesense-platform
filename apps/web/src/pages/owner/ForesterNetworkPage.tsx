import { useState } from 'react';

const OBSERVATIONS = [
  { id: 1, user: 'Anna L.', badge: 'Gold', location: 'Falun, Dalarna', lat: 60.61, lng: 15.63, species: 'Ips typographus', severity: 'high', status: 'verified', date: '2026-03-28', desc: 'Extensive bore dust at base of 15+ spruce trees. Crown yellowing visible.' },
  { id: 2, user: 'Erik J.', badge: 'Silver', location: 'Sandviken, G\u00E4vleborg', lat: 60.62, lng: 16.78, species: 'Ips typographus', severity: 'medium', status: 'verified', date: '2026-03-27', desc: 'Bore holes found on 5 trees near logging road. Early stage.' },
  { id: 3, user: 'Sofia B.', badge: 'Bronze', location: 'Karlstad, V\u00E4rmland', lat: 59.38, lng: 13.50, species: 'Ips typographus', severity: 'low', status: 'pending', date: '2026-03-26', desc: 'Possible stress signs. No bore dust yet. Drought stress likely.' },
  { id: 4, user: 'Oscar N.', badge: 'Gold', location: 'Mora, Dalarna', lat: 61.00, lng: 14.55, species: 'Ips typographus', severity: 'high', status: 'verified', date: '2026-03-25', desc: 'Massive outbreak confirmed. 30+ trees. Crown loss >60%.' },
  { id: 5, user: 'Lars S.', badge: 'Silver', location: 'Borl\u00E4nge, Dalarna', lat: 60.49, lng: 15.44, species: 'Dendroctonus', severity: 'medium', status: 'verified', date: '2026-03-24', desc: 'Pine bark beetle activity. 8 scots pine showing resin flow.' },
  { id: 6, user: 'Karin A.', badge: 'Bronze', location: 'Lule\u00E5, Norrbotten', lat: 65.58, lng: 22.15, species: 'Ips typographus', severity: 'low', status: 'pending', date: '2026-03-23', desc: 'First sighting this far north. Single tree affected. Monitoring.' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Oscar N.', badge: 'Gold', observations: 47, accuracy: 94 },
  { rank: 2, name: 'Anna L.', badge: 'Gold', observations: 38, accuracy: 91 },
  { rank: 3, name: 'Erik J.', badge: 'Silver', observations: 22, accuracy: 85 },
  { rank: 4, name: 'Lars S.', badge: 'Silver', observations: 18, accuracy: 83 },
  { rank: 5, name: 'Karin A.', badge: 'Bronze', observations: 6, accuracy: 67 },
];

export default function ForesterNetworkPage() {
  const [tab, setTab] = useState<'feed' | 'leaderboard'>('feed');
  const badgeColor = (b: string) => b === 'Gold' ? 'text-yellow-600 bg-yellow-50' : b === 'Silver' ? 'text-gray-500 bg-gray-100' : 'text-amber-700 bg-amber-50';
  const sevColor = (s: string) => s === 'high' ? 'bg-red-100 text-red-700' : s === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Forester Network</h1>
      <p className="text-gray-600 mb-6">Crowdsourced ground truth from forest owners across Sweden. Every verified observation improves our Sentinel-2 detection model.</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('feed')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'feed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Observation Feed</button>
        <button onClick={() => setTab('leaderboard')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'leaderboard' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Leaderboard</button>
      </div>

      {tab === 'feed' && (
        <div className="space-y-4">
          {OBSERVATIONS.map(o => (
            <div key={o.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{o.user}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(o.badge)}`}>{o.badge}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor(o.severity)}`}>{o.severity}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'verified' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{o.status}</span>
                <span className="text-xs text-gray-400 ml-auto">{o.date}</span>
              </div>
              <p className="text-sm text-gray-700 mb-1">{o.desc}</p>
              <p className="text-xs text-gray-400">{o.location} \u00B7 {o.species}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Forester</th><th className="p-3 text-left">Badge</th><th className="p-3 text-right">Observations</th><th className="p-3 text-right">Accuracy</th></tr></thead>
            <tbody>{LEADERBOARD.map(l => (
              <tr key={l.rank} className="border-t"><td className="p-3 font-bold">{l.rank}</td><td className="p-3">{l.name}</td><td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor(l.badge)}`}>{l.badge}</span></td><td className="p-3 text-right font-mono">{l.observations}</td><td className="p-3 text-right font-mono">{l.accuracy}%</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
