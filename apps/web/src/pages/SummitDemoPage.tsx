import { Link } from 'react-router-dom';

const DEMO_SEQUENCE = [
  { step: 1, title: 'The Problem', duration: '2 min', content: 'Sweden lost 32M mÂ³ of spruce timber to bark beetles 2018-2022. 44,000+ forest owners affected. Current detection relies on visual inspection â by the time you see damage, it is 6 weeks too late.', visual: 'Satellite before/after', cta: null },
  { step: 2, title: 'Spectral Detection', duration: '3 min', content: 'BeetleSense uses Sentinel-2 multispectral analysis (NDVI, EVI, GNDVI, Red Edge) to detect stress signatures 4-6 weeks before visible damage. Our Bayesian classifier leverages multi-temporal spectral analysis validated by Lund University research.', visual: 'Live spectral demo', cta: '/owner/spectral-fingerprint' },
  { step: 3, title: 'Prediction Engine', duration: '2 min', content: 'Degree-day accumulation model predicts swarming windows. 334Â°d above 5Â°C = first flight. IoT sensors feed real-time microclimate data for per-stand predictions.', visual: 'Predictor + IoT dashboard', cta: '/owner/green-attack-predictor' },
  { step: 4, title: 'Verification Pipeline', duration: '2 min', content: 'Satellite anomaly â automated drone mission â multispectral AI verification â ground truth confirmation. Eliminates false positives, validates true detections.', visual: 'Drone workflow', cta: '/owner/drone-verification' },
  { step: 5, title: 'Decision Support', duration: '3 min', content: 'Harvest optimizer balances timber value vs carbon credits vs beetle risk. Insurance recommender calculates cost-benefit. Climate playbook provides 10-year resilience strategy.', visual: 'Optimizer + Insurance', cta: '/owner/harvest-optimizer' },
  { step: 6, title: 'Community Intelligence', duration: '2 min', content: 'Forester Network enables crowdsourced ground truth observations. Regional heat map shows county-level risk. Carbon calculator values standing timber.', visual: 'Network + Heat Map', cta: '/owner/forester-network' },
  { step: 7, title: 'The Moat', duration: '1 min', content: '10 AI tools in one platform. No competitor globally combines spectral detection, degree-day prediction, drone verification, IoT monitoring, harvest optimization, insurance, carbon credits, community, and climate planning.', visual: 'Competitor comparison', cta: '/owner/dashboard' },
];

export default function SummitDemoPage() {
  const totalDuration = DEMO_SEQUENCE.reduce((s, d) => s + parseInt(d.duration), 0);
  const daysUntil = Math.max(0, Math.ceil((new Date('2026-04-20').getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-800 via-emerald-900 to-gray-900 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 backdrop-blur px-4 py-1 rounded-full text-sm mb-4">Forest Innovation Summit â¢ Silicon Valley â¢ April 20, 2026</div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">BeetleSense</h1>
          <p className="text-xl text-green-200 mb-6">AI-Powered Bark Beetle Early Warning System</p>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">The world's first platform combining satellite spectral analysis, IoT microclimate monitoring, drone verification, and AI prediction for forest pest management.</p>
          <div className="flex justify-center gap-8">
            <div><div className="text-4xl font-bold">{daysUntil}</div><div className="text-sm text-green-300">Days to Demo</div></div>
            <div><div className="text-4xl font-bold">{totalDuration}</div><div className="text-sm text-green-300">Min Demo</div></div>
            <div><div className="text-4xl font-bold">10</div><div className="text-sm text-green-300">AI Tools</div></div>
            <div><div className="text-4xl font-bold">0</div><div className="text-sm text-green-300">Competitors</div></div>
          </div>
        </div>
      </div>

      {/* Demo Script */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8">Demo Script â {totalDuration} Minutes</h2>
        <div className="space-y-6">
          {DEMO_SEQUENCE.map(step => (
            <div key={step.step} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-lg">{step.step}</div>
                  <div>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <span className="text-sm text-gray-400">{step.duration} â¢ {step.visual}</span>
                  </div>
                </div>
                {step.cta && <Link to={step.cta} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium">Open Demo â</Link>}
              </div>
              <p className="text-gray-300 leading-relaxed">{step.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Talking Points */}
      <div className="bg-gray-800 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Key Talking Points</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Sweden lost 32M mÂ³ of timber to bark beetles 2018-2022 (Skogsstyrelsen)',
              '34M m\u00B3 timber lost since 2018 \u2014 95% damage reduction confirmed by Skogsstyrelsen national inventory 2024',
              'Detects stress 4-6 weeks before visible damage â the critical intervention window',
              '334 degree-days above 5Â°C = Ips typographus swarming threshold',
              'EU ETS carbon pricing at â¬72/ton makes standing timber increasingly valuable',
              '44,000+ Swedish forest owners could benefit immediately',
              'No competitor globally combines all 10 capabilities in one platform',
              'FORWARDS/ROB4GREEN EU grant application submitted for â¬60K funding',
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-4">
                <span className="text-green-400 mt-0.5 flex-shrink-0">â</span>
                <span className="text-gray-300 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <Link to="/owner/dashboard" className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition-colors">Enter Command Center â</Link>
      </div>
    </div>
  );
}