import { useState } from 'react';

interface InsuranceQuote {
  provider: string; plan: string; annualPremium: number; coverage: number;
  deductible: number; beetleCoverage: boolean; stormCoverage: boolean;
  fireCoverage: boolean; carbonCreditProtection: boolean;
  responseTime: string; rating: number;
}

interface RiskProfile {
  area: number; sprucePercent: number; standAge: number;
  riskZone: 'critical' | 'high' | 'moderate' | 'low';
  historicalLosses: number; timberValue: number;
}

const DEFAULT_PROFILE: RiskProfile = { area: 45, sprucePercent: 65, standAge: 58, riskZone: 'high', historicalLosses: 1, timberValue: 3200000 };

const generateQuotes = (profile: RiskProfile): InsuranceQuote[] => {
  const base = profile.timberValue * 0.008;
  const riskMult = profile.riskZone === 'critical' ? 1.8 : profile.riskZone === 'high' ? 1.4 : profile.riskZone === 'moderate' ? 1.1 : 0.9;
  const ageMult = profile.standAge > 60 ? 1.3 : profile.standAge > 40 ? 1.1 : 1.0;
  const spruceMult = profile.sprucePercent > 70 ? 1.4 : profile.sprucePercent > 50 ? 1.2 : 1.0;
  const premium = Math.round(base * riskMult * ageMult * spruceMult);
  return [
    { provider: 'Länsförsäkringar Skog', plan: 'Comprehensive Forest', annualPremium: premium, coverage: profile.timberValue, deductible: 50000, beetleCoverage: true, stormCoverage: true, fireCoverage: true, carbonCreditProtection: false, responseTime: '24h', rating: 4.5 },
    { provider: 'Skogssällskapet Insurance', plan: 'Premium Protect', annualPremium: Math.round(premium * 1.15), coverage: Math.round(profile.timberValue * 1.2), deductible: 25000, beetleCoverage: true, stormCoverage: true, fireCoverage: true, carbonCreditProtection: true, responseTime: '12h', rating: 4.8 },
    { provider: 'If Skogsförsäkring', plan: 'Standard Forest', annualPremium: Math.round(premium * 0.85), coverage: Math.round(profile.timberValue * 0.8), deductible: 75000, beetleCoverage: true, stormCoverage: true, fireCoverage: true, carbonCreditProtection: false, responseTime: '48h', rating: 3.9 },
    { provider: 'Dina Försäkringar', plan: 'Basic Timber', annualPremium: Math.round(premium * 0.65), coverage: Math.round(profile.timberValue * 0.6), deductible: 100000, beetleCoverage: false, stormCoverage: true, fireCoverage: true, carbonCreditProtection: false, responseTime: '72h', rating: 3.4 },
  ];
};

const fmt = (v: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(v);

export default function InsuranceRecommenderPage() {
  const [profile, _setProfile] = useState<RiskProfile>(DEFAULT_PROFILE);
  const [quotes] = useState<InsuranceQuote[]>(() => generateQuotes(DEFAULT_PROFILE));
  const [selectedQuote, setSelectedQuote] = useState<InsuranceQuote | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Insurance Premium Recommender</h1>
          <p className="text-gray-600 dark:text-gray-400">AI-powered insurance comparison based on your forest risk profile, powered by BeetleSense risk data.</p>
        </div>

        {/* Risk Profile Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border mb-8">
          <h2 className="text-lg font-bold mb-4">Your Risk Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div><div className="text-xs text-gray-500">Total Area</div><div className="text-lg font-bold">{profile.area} ha</div></div>
            <div><div className="text-xs text-gray-500">Spruce %</div><div className="text-lg font-bold">{profile.sprucePercent}%</div></div>
            <div><div className="text-xs text-gray-500">Avg Stand Age</div><div className="text-lg font-bold">{profile.standAge} yr</div></div>
            <div><div className="text-xs text-gray-500">Risk Zone</div><div className={`text-lg font-bold ${profile.riskZone === 'critical' ? 'text-red-600' : profile.riskZone === 'high' ? 'text-orange-600' : 'text-green-600'}`}>{profile.riskZone.toUpperCase()}</div></div>
            <div><div className="text-xs text-gray-500">Past Losses</div><div className="text-lg font-bold">{profile.historicalLosses}</div></div>
            <div><div className="text-xs text-gray-500">Timber Value</div><div className="text-lg font-bold text-green-600">{fmt(profile.timberValue)}</div></div>
          </div>
        </div>

        {/* Quote Comparison */}
        <h2 className="text-lg font-bold mb-4">Recommended Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {quotes.sort((a, b) => b.rating - a.rating).map((q, i) => (
            <button key={i} onClick={() => setSelectedQuote(q)} className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border text-left transition-all hover:shadow-md ${i === 0 ? 'ring-2 ring-green-500' : ''} ${selectedQuote === q ? 'ring-2 ring-blue-500' : ''}`}>
              {i === 0 && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold mb-2 inline-block">BEST MATCH</span>}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{q.provider}</h3>
              <p className="text-sm text-gray-500 mb-3">{q.plan}</p>
              <div className="flex justify-between items-center mb-3">
                <div><div className="text-xs text-gray-500">Annual Premium</div><div className="text-xl font-bold text-blue-600">{fmt(q.annualPremium)}</div></div>
                <div className="text-right"><div className="text-xs text-gray-500">Coverage</div><div className="text-xl font-bold text-green-600">{fmt(q.coverage)}</div></div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {q.beetleCoverage && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Beetle ✓</span>}
                {q.stormCoverage && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">Storm ✓</span>}
                {q.fireCoverage && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">Fire ✓</span>}
                {q.carbonCreditProtection && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">Carbon ✓</span>}
                {!q.beetleCoverage && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">No Beetle ✗</span>}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deductible: {fmt(q.deductible)}</span>
                <span className="text-gray-500">Response: {q.responseTime}</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, s) => (<span key={s} className={s < Math.floor(q.rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>))}
                <span className="text-sm text-gray-500 ml-1">{q.rating}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Cost-Benefit Analysis */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-2">Cost-Benefit Analysis</h3>
          <p className="text-sm opacity-90 mb-4">Based on your risk profile and historical data for the region</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><div className="opacity-75 text-sm">Expected Annual Loss</div><div className="text-xl font-bold">{fmt(Math.round(profile.timberValue * 0.035))}</div></div>
            <div><div className="opacity-75 text-sm">Best Premium</div><div className="text-xl font-bold">{fmt(quotes.sort((a,b) => a.annualPremium - b.annualPremium)[0]?.annualPremium || 0)}</div></div>
            <div><div className="opacity-75 text-sm">Net Benefit</div><div className="text-xl font-bold">{fmt(Math.round(profile.timberValue * 0.035) - (quotes.sort((a,b) => a.annualPremium - b.annualPremium)[0]?.annualPremium || 0))}/yr</div></div>
            <div><div className="opacity-75 text-sm">ROI</div><div className="text-xl font-bold">{Math.round(((profile.timberValue * 0.035) / (quotes.sort((a,b) => a.annualPremium - b.annualPremium)[0]?.annualPremium || 1)) * 100)}%</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}