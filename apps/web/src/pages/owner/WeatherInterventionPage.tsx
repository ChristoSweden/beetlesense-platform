import { useState } from 'react';
interface InterventionRule { id: string; name: string; trigger: string; conditions: string[]; action: string; status: 'armed' | 'triggered' | 'cooldown' | 'disabled'; lastTriggered: string; priority: 'critical' | 'high' | 'medium'; responseTime: string; }
const RULES: InterventionRule[] = [
  { id: 'R-01', name: 'Peak Swarming Alert', trigger: 'DD \u2265 140 AND temp \u2265 16.5\u00B0C AND wind < 4 m/s', conditions: ['Degree-day threshold crossed', 'Air temp above flight minimum', 'Low wind for beetle flight'], action: 'SMS + push notification to all field teams. Auto-dispatch drone to highest-risk grid cells. Block harvest operations in buffer zones.', status: 'armed', lastTriggered: '-', priority: 'critical', responseTime: '< 30 min' },
  { id: 'R-02', name: 'Drone Survey Window', trigger: 'Clear sky \u2265 3h AND wind < 6 m/s AND no precipitation', conditions: ['Weather window for safe drone ops', 'Minimum 3h clear forecast', 'Wind below drone limit'], action: 'Auto-schedule drone survey for pending verification areas. Notify pilot. Generate optimal flight path.', status: 'triggered', lastTriggered: '2h ago', priority: 'high', responseTime: '< 2h' },
  { id: 'R-03', name: 'Spray Window Optimizer', trigger: 'Temp 10-25\u00B0C AND no rain 48h AND wind < 3 m/s', conditions: ['Temperature range for effective treatment', 'Dry period for chemical adherence', 'Low wind for spray drift control'], action: 'Alert treatment crews with GPS coordinates of spray-priority trees. Calculate optimal spray volume per tree.', status: 'cooldown', lastTriggered: '3d ago', priority: 'medium', responseTime: '< 4h' },
  { id: 'R-04', name: 'Storm Damage Rapid Assessment', trigger: 'Wind \u2265 20 m/s OR gusts \u2265 25 m/s in forested area', conditions: ['Severe wind event in monitored zone', 'Risk of windthrow creating beetle habitat'], action: 'Post-storm: auto-dispatch drone for damage assessment within 24h. Flag new beetle risk zones from fallen timber.', status: 'armed', lastTriggered: '-', priority: 'critical', responseTime: '< 24h' },
  { id: 'R-05', name: 'Frost Reset Monitor', trigger: 'Temp < -5\u00B0C for \u2265 3 consecutive days', conditions: ['Extended freeze kills overwintering larvae', 'Reduces spring population'], action: 'Update population model. Reduce risk scores in affected grids. Notify forest owners of reduced threat.', status: 'disabled', lastTriggered: 'Feb 12', priority: 'medium', responseTime: '< 12h' },
];
const STATUS_COLORS = { armed: '#10B981', triggered: '#EF4444', cooldown: '#F59E0B', disabled: '#6B7280' };
const PRIO_COLORS = { critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6' };
export default function WeatherInterventionPage() {
  const [selectedRule, setSelectedRule] = useState(RULES[0]);
  const armed = RULES.filter(r => r.status === 'armed').length;
  const triggered = RULES.filter(r => r.status === 'triggered').length;
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6"><div className="max-w-7xl mx-auto">
      <div className="mb-8"><div className="flex items-center gap-3 mb-2"><span className="text-3xl">\u26A1</span><h1 className="text-3xl font-bold">Weather-Triggered Automation</h1><span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">AUTO-DISPATCH</span></div>
        <p className="text-[var(--text3)] max-w-3xl">Automatically dispatch drones, alert crews, and optimize spray windows when weather + phenology conditions align. Integrates SMHI weather API + degree-day model + workforce calendar. Reduces response time 50% by eliminating manual decision delays.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-[var(--green)]">{armed}</div><div className="text-sm text-[var(--text3)]">Rules Armed</div></div>
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-red-400">{triggered}</div><div className="text-sm text-[var(--text3)]">Currently Triggered</div></div>
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-amber-400">{RULES.length}</div><div className="text-sm text-[var(--text3)]">Total Rules</div></div>
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-blue-400">50%</div><div className="text-sm text-[var(--text3)]">Response Time Reduction</div></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">{RULES.map(rule => (
          <button key={rule.id} onClick={() => setSelectedRule(rule)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedRule.id === rule.id ? 'ring-2 ring-blue-500' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[rule.status] }} /><span className="font-medium text-sm">{rule.name}</span></div>
              <div className="flex items-center gap-2"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: PRIO_COLORS[rule.priority] + '20', color: PRIO_COLORS[rule.priority] }}>{rule.priority}</span><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[rule.status] + '20', color: STATUS_COLORS[rule.status] }}>{rule.status}</span></div></div>
            <div className="text-xs text-[var(--text3)] font-mono bg-[var(--bg3)] rounded px-2 py-1">{rule.trigger}</div>
          </button>))}</div>
        <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
          <h3 className="font-semibold mb-4">\u26A1 {selectedRule.name}</h3>
          <div className="mb-4"><div className="text-xs text-[var(--text3)] mb-1">Trigger Condition</div><div className="font-mono text-sm bg-[var(--bg3)] rounded p-2">{selectedRule.trigger}</div></div>
          <div className="mb-4"><div className="text-xs text-[var(--text3)] mb-1">Required Conditions</div><ul className="space-y-1">{selectedRule.conditions.map(c => <li key={c} className="text-sm flex items-center gap-2"><span className="text-[var(--green)]">\u2713</span>{c}</li>)}</ul></div>
          <div className="mb-4"><div className="text-xs text-[var(--text3)] mb-1">Automated Action</div><p className="text-sm">{selectedRule.action}</p></div>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-[var(--text3)]">Response time:</span> {selectedRule.responseTime}</div><div><span className="text-[var(--text3)]">Last triggered:</span> {selectedRule.lastTriggered}</div></div>
        </div></div></div></div>);
}