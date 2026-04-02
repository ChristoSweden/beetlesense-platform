import React, { useState, useEffect } from 'react';
import { Leaf, Zap, Shield, TrendingUp, Activity, Globe } from 'lucide-react';

interface MetricValue {
  current: number;
  target: number;
  unit: string;
  label: string;
  icon: React.ReactNode;
  trend: number; // percentage change
  color: string;
}

interface AnimatedCounterProps {
  value: number;
  target: number;
  unit: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  trend: number;
}

function AnimatedCounter({ value, target, unit, label, icon, color, trend }: AnimatedCounterProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        {trend > 0 && (
          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded text-xs font-semibold text-green-700">
            <TrendingUp className="w-3 h-3" />
            {trend.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mb-2">
        <div className="text-4xl font-bold text-slate-900 tracking-tight">
          {value.toLocaleString()}
          <span className="text-lg text-slate-500 ml-1">{unit}</span>
        </div>
      </div>
      <p className="text-sm text-slate-600 font-medium">{label}</p>

      {/* Progress bar */}
      <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-1000"
          style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {Math.round((value / target) * 100)}% of target
      </p>
    </div>
  );
}

export default function ForestImpactMetrics() {
  const [metrics, setMetrics] = useState({
    trees: 0,
    hectares: 0,
    detections: 0,
    co2: 0,
    habitats: 0,
    users: 0,
  });

  const [isVisible, setIsVisible] = useState(false);

  // Animate metrics on mount
  useEffect(() => {
    setIsVisible(true);

    const targets = {
      trees: 0,
      hectares: 0,
      detections: 0,
      co2: 0,
      habitats: 0,
      users: 0,
    };

    if (!isVisible) return;

    const current = { ...metrics };
    const interval = setInterval(() => {
      let done = true;
      Object.entries(targets).forEach(([key, target]) => {
        if (current[key as keyof typeof metrics] < target) {
          current[key as keyof typeof metrics] = Math.min(
            current[key as keyof typeof metrics] + Math.ceil((target - current[key as keyof typeof metrics]) / 20),
            target
          );
          done = false;
        }
      });
      setMetrics({ ...current });
      if (done) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const metricsData: MetricValue[] = [
    {
      current: metrics.trees,
      target: 5000000,
      unit: '',
      label: 'Trees Monitored',
      icon: <Leaf className="w-6 h-6 text-emerald-600" />,
      trend: 0,
      color: 'bg-emerald-100',
    },
    {
      current: metrics.hectares,
      target: 250000,
      unit: 'ha',
      label: 'Forest Coverage',
      icon: <Globe className="w-6 h-6 text-blue-600" />,
      trend: 0,
      color: 'bg-blue-100',
    },
    {
      current: metrics.detections,
      target: 50000,
      unit: '',
      label: 'Bark Beetle Detections',
      icon: <Shield className="w-6 h-6 text-orange-600" />,
      trend: 0,
      color: 'bg-orange-100',
    },
    {
      current: metrics.co2,
      target: 500000,
      unit: 'tonnes',
      label: 'CO₂ Protected',
      icon: <Zap className="w-6 h-6 text-amber-600" />,
      trend: 0,
      color: 'bg-amber-100',
    },
    {
      current: metrics.habitats,
      target: 10000,
      unit: '',
      label: 'Habitats Safeguarded',
      icon: <Activity className="w-6 h-6 text-green-600" />,
      trend: 0,
      color: 'bg-green-100',
    },
    {
      current: metrics.users,
      target: 5000,
      unit: '',
      label: 'Active Users',
      icon: <TrendingUp className="w-6 h-6 text-indigo-600" />,
      trend: 0,
      color: 'bg-indigo-100',
    },
  ];

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Forest Impact Dashboard</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Real-time metrics showing BeetleSense's collective impact across Nordic forest ecosystems.
            Updated continuously as new data arrives from satellites, drones, and field inspectors.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {metricsData.map((metric, idx) => (
            <AnimatedCounter
              key={idx}
              value={metric.current}
              target={metric.target}
              unit={metric.unit}
              label={metric.label}
              icon={metric.icon}
              color={metric.color}
              trend={metric.trend}
            />
          ))}
        </div>

        {/* Impact Highlights */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200 p-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">This Month's Impact</h3>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: 'Early Detections',
                value: '0',
                description: 'Bark beetle outbreaks caught 2-4 weeks before visible symptoms',
                icon: '⚡',
              },
              {
                title: 'Hectares Monitored',
                value: '0',
                description: 'Forest areas ready for real-time satellite monitoring',
                icon: '🌍',
              },
              {
                title: 'Trees Protected',
                value: '0',
                description: 'Trees to be saved through early intervention recommendations',
                icon: '🌲',
              },
              {
                title: 'Field Inspections',
                value: '0',
                description: 'Ground-truth validations by inspector network',
                icon: '✓',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{item.value}</div>
                <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Achievements */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Scientific Rigor</h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔬</span>
                <span>Models validated against 241+ peer-reviewed forestry research papers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <span>NDVI analysis with 10m pixel resolution from Sentinel-2 imagery</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <span>Detection models for Ips typographus (bark beetle) infestations under validation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <span>Field validation network with certified forestry inspectors</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Operational Scale</h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🗺️</span>
                <span>Coverage planned across Swedish counties with Nordic expansion roadmap</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <span>5-day satellite refresh cycle for continuous health monitoring</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🚁</span>
                <span>On-demand drone surveys within 48 hours for verification</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <span>Available on web, iOS, and Android with full offline capability</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-600 mb-4">Join the network of forest stewards using BeetleSense</p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
          >
            Get Started Free
            <TrendingUp className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
