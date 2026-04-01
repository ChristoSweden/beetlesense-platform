import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Leaf,
  BarChart3,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  draftText: string;
  category: 'assessment' | 'planning' | 'documentation' | 'coordination';
}

interface GrantReadinessState {
  items: ChecklistItem[];
  hectares: number;
}

const GrantReadiness: React.FC = () => {
  const [state, setState] = useState<GrantReadinessState>({
    hectares: 50,
    items: [
      {
        id: 'inventory',
        title: 'Forest Inventory Data Uploaded',
        description: 'Complete forest inventory with species, age, health metrics',
        isCompleted: false,
        draftText: `Forest Inventory Summary

Property Details:
- Total Area: [INSERT HECTARES] hectares
- Forest Type: [Pine/Spruce/Mixed]
- Average Tree Age: [INSERT YEARS]
- Current Density: [INSERT TREES/HA]
- Species Composition: [INSERT %]

Assessment Date: ${new Date().toLocaleDateString('sv-SE')}
Data Source: BeetleSense Platform

This inventory was prepared using AI-assisted analysis and satellite imagery to provide accurate baseline measurements for grant application.`,
        category: 'assessment',
      },
      {
        id: 'damage',
        title: 'Beetle Damage Assessment Completed',
        description: 'Documented current and historical beetle damage levels',
        isCompleted: false,
        draftText: `Beetle Damage Assessment Report

Current Status (${new Date().getFullYear()}):
- Affected Area: [INSERT HECTARES] hectares
- Damage Severity: [LOW/MODERATE/HIGH]
- Primary Species: [Ips typographus/Other]
- Economic Impact: €[INSERT AMOUNT]

Historical Trend:
- 2024: [INSERT %] of forest affected
- 2025: [INSERT %] of forest affected
- 2026: [INSERT %] of forest affected

Risk Projection:
Without intervention, projected spread to [INSERT HECTARES] hectares within 24 months.
Early detection and mitigation can reduce damage by 40-60%.

Assessment Method: AI-powered satellite monitoring + ground verification`,
        category: 'assessment',
      },
      {
        id: 'financial',
        title: 'Financial Impact Calculated',
        description: 'Quantified economic impact and recovery timeline',
        isCompleted: false,
        draftText: `Financial Impact Analysis

Direct Costs:
- Timber Loss Value: €[INSERT AMOUNT]
- Remediation Costs: €[INSERT AMOUNT]
- Monitoring Expenses: €[INSERT AMOUNT]
- Total Direct Impact: €[INSERT AMOUNT]

Indirect Costs:
- Reduced Carbon Sequestration: €[INSERT AMOUNT]
- Ecosystem Service Loss: €[INSERT AMOUNT]
- Labor & Equipment: €[INSERT AMOUNT]

Financial Projection:
- Cost without intervention (2026): €[INSERT AMOUNT]
- Cost with BeetleSense (annual): €[INSERT AMOUNT]
- Net savings over 5 years: €[INSERT AMOUNT]

This analysis demonstrates ROI of [INSERT %] within 3 years of implementation.`,
        category: 'assessment',
      },
      {
        id: 'boundaries',
        title: 'Property Boundaries Mapped',
        description: 'Geospatial data with accurate boundary definitions',
        isCompleted: false,
        draftText: `Property Boundary Documentation

Geospatial Information:
- Land Registry Reference: [INSERT REFERENCE]
- Coordinates (WGS84): [INSERT LAT], [INSERT LON]
- Boundary Type: [Natural/Cadastral/Other]
- Survey Date: ${new Date().toLocaleDateString('sv-SE')}

Area Summary:
- Total Registered Area: [INSERT HECTARES] ha
- Forest Area: [INSERT HECTARES] ha
- High-Risk Zone: [INSERT HECTARES] ha

Map Data:
- Source: BeetleSense + OpenStreetMap
- Resolution: [INSERT RESOLUTION]
- Last Updated: ${new Date().toLocaleDateString('sv-SE')}

All boundaries have been verified against official land registry records.`,
        category: 'documentation',
      },
      {
        id: 'history',
        title: 'Historical Damage Records',
        description: 'Documentation of previous damage events and responses',
        isCompleted: false,
        draftText: `Historical Damage & Management Records

Past Events:
- 2020: [INSERT INCIDENT & RESPONSE]
- 2021: [INSERT INCIDENT & RESPONSE]
- 2022: [INSERT INCIDENT & RESPONSE]
- 2023: [INSERT INCIDENT & RESPONSE]
- 2024: [INSERT INCIDENT & RESPONSE]
- 2025: [INSERT INCIDENT & RESPONSE]

Previous Management Actions:
- Thinning Operations: [DATES & RESULTS]
- Pest Control Measures: [METHODS & OUTCOMES]
- Monitoring Programs: [FREQUENCY & FINDINGS]

Lessons Learned:
[DESCRIBE WHAT WORKED AND WHAT DIDN'T]

Current Prevention Strategy:
BeetleSense early detection system provides continuous monitoring to prevent
recurrence of previous damage patterns.`,
        category: 'assessment',
      },
      {
        id: 'mitigation',
        title: 'Mitigation Plan Drafted',
        description: 'Comprehensive strategy for beetle prevention and response',
        isCompleted: false,
        draftText: `Integrated Beetle Mitigation Plan

Objectives:
- Reduce beetle infestation by 60% within 24 months
- Restore forest health and productivity
- Implement sustainable long-term monitoring
- Achieve carbon sequestration targets

Strategies:

1. Early Detection & Monitoring
   - Real-time satellite monitoring via BeetleSense
   - Monthly threat assessments
   - Rapid response protocols for high-risk areas

2. Forest Management
   - Selective thinning in high-risk zones
   - Species diversification planting
   - Spacing optimization (target: 1.5m between trees)

3. Rapid Response
   - Within 48 hours of detection: site assessment
   - Within 1 week: removal and processing of affected timber
   - Within 2 weeks: remediation completed

4. Long-term Sustainability
   - Quarterly monitoring reports
   - Annual strategy review
   - Climate-resilient species selection

Timeline:
- Month 1-2: Planning & preparation
- Month 3-12: Implementation
- Month 13+: Monitoring & optimization

Success Metrics:
- [INSERT SPECIFIC METRICS]`,
        category: 'planning',
      },
      {
        id: 'budget',
        title: 'Budget Estimation Completed',
        description: 'Detailed cost breakdown for all project activities',
        isCompleted: false,
        draftText: `Grant Application Budget Breakdown

Direct Project Costs:

Equipment & Technology (Year 1):
- BeetleSense AI Platform: €[INSERT AMOUNT]
- Monitoring Equipment: €[INSERT AMOUNT]
- Drone/Satellite Data: €[INSERT AMOUNT]
- Software Licenses: €[INSERT AMOUNT]
Subtotal: €[INSERT AMOUNT]

Personnel & Services:
- Forest Consultant (150 hours): €[INSERT AMOUNT]
- Forestry Workers (harvest/treatment): €[INSERT AMOUNT]
- Administrative Support: €[INSERT AMOUNT]
Subtotal: €[INSERT AMOUNT]

Materials & Operations:
- Replanting/restoration: €[INSERT AMOUNT]
- Equipment maintenance: €[INSERT AMOUNT]
- Field operations: €[INSERT AMOUNT]
Subtotal: €[INSERT AMOUNT]

Indirect Costs (15%):
€[INSERT AMOUNT]

TOTAL PROJECT BUDGET: €[INSERT AMOUNT]

Co-financing:
- Landowner contribution (30%): €[INSERT AMOUNT]
- Requested grant (70%): €[INSERT AMOUNT]

Cost per Hectare: €[INSERT AMOUNT/HA]

This budget reflects efficient resource use while ensuring effective implementation
of all mitigation and monitoring activities.`,
        category: 'documentation',
      },
      {
        id: 'partners',
        title: 'Partner Organizations Identified',
        description: 'Coordination with relevant forestry and conservation partners',
        isCompleted: false,
        draftText: `Project Partner Organizations

Primary Partners:

1. [PARTNER NAME]
   - Role: [SPECIFICATION]
   - Contact: [NAME & EMAIL]
   - Commitment: [DESCRIBE CONTRIBUTION]
   - Letter of Intent: Attached

2. [PARTNER NAME]
   - Role: [SPECIFICATION]
   - Contact: [NAME & EMAIL]
   - Commitment: [DESCRIBE CONTRIBUTION]
   - Letter of Intent: Attached

Supporting Organizations:

- Local Forest Owner Association: [ROLE]
- Regional Forestry Board: [ROLE]
- Environmental NGO: [ROLE]

Knowledge Partners:
- Research Institution: [UNIVERSITY/INSTITUTE]
- Technology Provider: BeetleSense Platform
- Certification Body: [IF APPLICABLE]

Collaboration Framework:
- Monthly coordination meetings
- Quarterly progress reviews
- Annual strategy adjustments
- Data sharing agreements in place

All partners have committed to supporting this project and have provided
written confirmation of their involvement and contributions.`,
        category: 'coordination',
      },
      {
        id: 'environmental',
        title: 'Environmental Impact Assessment',
        description: 'Analysis of project impact on biodiversity and ecosystems',
        isCompleted: false,
        draftText: `Environmental Impact Assessment

Positive Impacts:

Biodiversity Protection:
- Prevent collapse of [INSERT HA] of critical habitat
- Maintain forest connectivity for [INSERT SPECIES]
- Preserve rare species populations

Climate & Carbon:
- Sequester additional [INSERT TONS] CO₂/year
- Maintain long-term carbon storage
- Contribute to climate change mitigation targets
- Support EU Green Deal objectives

Water & Soil:
- Maintain soil health and structure
- Preserve water filtration function
- Protect groundwater quality

Sustainable Use:
- Support continued timber production
- Enable recreational use
- Maintain ecosystem services

Risk Mitigation:
- Reduce catastrophic forest loss risk
- Prevent secondary pest infestations
- Enable ecosystem recovery

Monitoring & Adaptive Management:
- Continuous environmental monitoring via BeetleSense
- Annual impact assessments
- Adaptive management adjustments
- Transparent reporting to authorities

This project aligns with:
- EU Biodiversity Strategy 2030
- EU Green Deal targets
- National Climate Commitments
- Forest Stewardship Council standards`,
        category: 'planning',
      },
      {
        id: 'timeline',
        title: 'Timeline & Milestones Defined',
        description: 'Detailed project schedule with measurable milestones',
        isCompleted: false,
        draftText: `Project Timeline & Milestone Schedule

Project Duration: [INSERT MONTHS] months
Start Date: ${new Date().toLocaleDateString('sv-SE')}
Completion Date: [INSERT DATE]

Phase 1: Planning & Setup (Months 1-2)

- Week 1-2: Partner coordination meetings
- Week 2-3: Equipment procurement
- Week 3-4: Team training and preparation
- Milestone 1: All equipment operational and team trained

Phase 2: Implementation (Months 3-12)

- Month 3: Begin monitoring & assessment
- Month 4-5: Implement mitigation measures
- Month 6: First progress assessment
- Month 7-9: Continued monitoring and adaptive management
- Month 10-11: Damage mitigation completion
- Milestone 2: All planned mitigation activities completed

Phase 3: Monitoring & Evaluation (Months 13+)

- Months 13-24: Continuous BeetleSense monitoring
- Month 12: Mid-term evaluation
- Month 24: Final impact assessment
- Milestone 3: Demonstrable damage reduction and ecosystem recovery

Key Performance Indicators:

- Beetle detection latency: < 1 week
- Treatment response time: < 14 days
- Damage reduction: target 60% by Month 24
- Cost per hectare managed: < €150/ha/year

All timelines include contingency buffers (15%) for seasonal variations
and unexpected environmental conditions.`,
        category: 'planning',
      },
    ],
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Calculate progress
  const completedCount = state.items.filter((item) => item.isCompleted).length;
  const progressPercentage = Math.round((completedCount / state.items.length) * 100);

  // Calculate estimated grant based on hectares
  const estimatedGrant = useMemo(() => {
    const maxGrant = 60000;
    const maxHectares = 500;
    const hectareRatio = Math.min(state.hectares / maxHectares, 1);
    const baseGrant = maxGrant * hectareRatio;
    return Math.round(baseGrant);
  }, [state.hectares]);

  // Calculate days to deadline
  const daysToDeadline = useMemo(() => {
    const deadline = new Date('2026-04-04').getTime();
    const now = new Date().getTime();
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  }, []);

  const urgency =
    daysToDeadline < 3 ? 'critical' : daysToDeadline < 7 ? 'high' : 'normal';

  const toggleItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      ),
    }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportSummary = () => {
    const summary = `GRANT APPLICATION READINESS SUMMARY
Generated: ${new Date().toLocaleDateString('sv-SE')}

PROJECT DETAILS
================
Forest Area: ${state.hectares} hectares
Estimated Grant Amount: €${estimatedGrant.toLocaleString('sv-SE')}
Deadline: April 4, 2026
Days Remaining: ${daysToDeadline}

COMPLETION STATUS
=================
Progress: ${progressPercentage}% (${completedCount}/${state.items.length} items)

${state.items
  .map(
    (item) => `
${item.isCompleted ? '[✓]' : '[ ]'} ${item.title}
   ${item.description}
   Status: ${item.isCompleted ? 'COMPLETED' : 'PENDING'}
`
  )
  .join('')}

GRANT READINESS ASSESSMENT
===========================

Assessment Category Breakdown:
- Assessment Items (4 of 10): ${state.items.filter((i) => i.category === 'assessment' && i.isCompleted).length}/4 completed
- Planning Items (2 of 10): ${state.items.filter((i) => i.category === 'planning' && i.isCompleted).length}/2 completed
- Documentation (2 of 10): ${state.items.filter((i) => i.category === 'documentation' && i.isCompleted).length}/2 completed
- Coordination (1 of 10): ${state.items.filter((i) => i.category === 'coordination' && i.isCompleted).length}/1 completed

NEXT STEPS
==========
1. Complete remaining assessment items (satellite data, damage evaluation)
2. Finalize mitigation strategy and budget details
3. Secure letters of commitment from all partners
4. Conduct final environmental compliance review
5. Submit complete application by April 3, 2026

For each item marked [✓], use the generated draft text as a starting point
for your official grant application documentation.

---
Generated by BeetleSense Grant Readiness Checker
${new Date().toLocaleString('sv-SE')}
`;

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(summary)}`);
    element.setAttribute('download', `GrantReadiness_${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-blue-900/40 via-emerald-900/40 to-blue-900/40 border border-blue-700/30 rounded-lg p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">
                Grant Application Readiness Checker
              </h2>
            </div>
            <p className="text-gray-300 text-sm">
              FORWARDS/ROB4GREEN Grant (EU) - Up to €150,000 for AI-powered forestry innovation
            </p>
          </div>

          {/* Deadline Badge */}
          <motion.div
            animate={urgency === 'critical' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`px-4 py-3 rounded-lg text-center flex-shrink-0 ${
              urgency === 'critical'
                ? 'bg-red-900/40 border border-red-600/60'
                : urgency === 'high'
                ? 'bg-orange-900/40 border border-orange-600/60'
                : 'bg-blue-900/40 border border-blue-600/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock
                className={`w-4 h-4 ${
                  urgency === 'critical'
                    ? 'text-red-400'
                    : urgency === 'high'
                    ? 'text-orange-400'
                    : 'text-blue-400'
                }`}
              />
              <span className="text-xs font-semibold text-gray-300">DEADLINE</span>
            </div>
            <div
              className={`text-lg font-bold ${
                urgency === 'critical'
                  ? 'text-red-400'
                  : urgency === 'high'
                  ? 'text-orange-400'
                  : 'text-blue-400'
              }`}
            >
              {daysToDeadline} days left
            </div>
            <div className="text-xs text-gray-400 mt-1">April 4, 2026</div>
          </motion.div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/30 rounded p-3 border border-gray-700/30">
            <div className="text-xs text-gray-400 mb-1">Progress</div>
            <div className="text-xl font-bold text-emerald-400">
              {progressPercentage}%
            </div>
            <div className="text-xs text-gray-500">{completedCount} of 10 items</div>
          </div>
          <div className="bg-black/30 rounded p-3 border border-gray-700/30">
            <div className="text-xs text-gray-400 mb-1">Est. Grant</div>
            <div className="text-xl font-bold text-emerald-400">€{estimatedGrant.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{state.hectares} hectares</div>
          </div>
          <div className="bg-black/30 rounded p-3 border border-gray-700/30">
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <div
              className={`text-xl font-bold ${
                progressPercentage === 100
                  ? 'text-emerald-400'
                  : progressPercentage >= 70
                  ? 'text-blue-400'
                  : 'text-orange-400'
              }`}
            >
              {progressPercentage === 100
                ? 'Ready'
                : progressPercentage >= 70
                ? 'On Track'
                : 'In Progress'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hectare Estimator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white text-lg">Grant Amount Estimator</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">Forest Area (hectares)</label>
              <div className="text-lg font-bold text-emerald-400">{state.hectares} ha</div>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              value={state.hectares}
              onChange={(e) =>
                setState((prev) => ({ ...prev, hectares: parseInt(e.target.value) }))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10 ha</span>
              <span>500 ha</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700/30">
            <div>
              <div className="text-xs text-gray-400 mb-1">Cost per Hectare</div>
              <div className="text-2xl font-bold text-blue-400">€{Math.round(estimatedGrant / state.hectares)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Estimated Total Grant</div>
              <div className="text-2xl font-bold text-emerald-400">€{estimatedGrant.toLocaleString()}</div>
            </div>
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-700/30">
            Estimate based on €150,000 maximum grant for up to 500 hectares. Actual amount
            depends on project quality, partner strength, and environmental impact.
          </p>
        </div>
      </motion.div>

      {/* Progress Ring */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-5"
      >
        <h3 className="font-semibold text-white text-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Completion Progress
        </h3>

        <div className="flex items-center justify-between">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgb(55, 65, 81)"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeDasharray={`${(2 * Math.PI * 54 * progressPercentage) / 100} ${2 * Math.PI * 54}`}
                strokeLinecap="round"
                animate={{
                  strokeDasharray: [
                    `${(2 * Math.PI * 54 * (progressPercentage - 5)) / 100} ${2 * Math.PI * 54}`,
                    `${(2 * Math.PI * 54 * progressPercentage) / 100} ${2 * Math.PI * 54}`,
                  ],
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={progressPercentage}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  {progressPercentage}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {completedCount}/{state.items.length} items
                </div>
              </motion.div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="flex-1 ml-8 space-y-3">
            {[
              {
                name: 'Assessment',
                count: state.items.filter((i) => i.category === 'assessment').length,
                completed: state.items.filter((i) => i.category === 'assessment' && i.isCompleted)
                  .length,
                color: 'from-red-400 to-orange-400',
              },
              {
                name: 'Planning',
                count: state.items.filter((i) => i.category === 'planning').length,
                completed: state.items.filter((i) => i.category === 'planning' && i.isCompleted)
                  .length,
                color: 'from-blue-400 to-cyan-400',
              },
              {
                name: 'Documentation',
                count: state.items.filter((i) => i.category === 'documentation').length,
                completed: state.items.filter((i) => i.category === 'documentation' && i.isCompleted)
                  .length,
                color: 'from-purple-400 to-pink-400',
              },
              {
                name: 'Coordination',
                count: state.items.filter((i) => i.category === 'coordination').length,
                completed: state.items.filter((i) => i.category === 'coordination' && i.isCompleted)
                  .length,
                color: 'from-emerald-400 to-teal-400',
              },
            ].map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-400">{cat.name}</span>
                  <span className={`font-semibold bg-gradient-to-r ${cat.color} bg-clip-text text-transparent`}>
                    {cat.completed}/{cat.count}
                  </span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full bg-gradient-to-r ${cat.color}`}
                    animate={{ width: `${(cat.completed / cat.count) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Checklist Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-semibold text-white text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Application Checklist
        </h3>

        <AnimatePresence>
          {state.items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`border rounded-lg overflow-hidden transition-all ${
                item.isCompleted
                  ? 'bg-emerald-900/20 border-emerald-600/30'
                  : 'bg-gray-900/40 border-gray-700/30 hover:border-gray-600/50'
              }`}
            >
              {/* Main Item */}
              <button
                onClick={() => toggleExpanded(item.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-black/20 transition-colors"
              >
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItem(item.id);
                  }}
                  className="flex-shrink-0 mt-1"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={{
                      scale: item.isCompleted ? 1.2 : 1,
                      rotate: item.isCompleted ? 360 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-500" />
                    )}
                  </motion.div>
                </motion.button>

                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold transition-colors ${
                      item.isCompleted ? 'text-emerald-400 line-through' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                </div>

                <div className="flex-shrink-0 text-gray-400 ml-2">
                  {expandedItems.has(item.id) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedItems.has(item.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-700/30 bg-black/30"
                  >
                    <div className="p-4 space-y-3">
                      {/* Draft Text */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase">
                            Generated Draft Text
                          </label>
                          <motion.button
                            onClick={() => copyToClipboard(item.id, item.draftText)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-medium transition-colors"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </motion.button>
                        </div>
                        <div className="bg-gray-950/70 rounded p-3 max-h-64 overflow-y-auto border border-gray-700/30">
                          <p className="text-xs leading-relaxed text-gray-300 whitespace-pre-wrap font-mono">
                            {item.draftText}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Edit this text to match your specific circumstances. Replace bracketed
                          values [INSERT ...] with your actual data.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-gray-700/30">
                        <motion.button
                          onClick={() => toggleItem(item.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
                            item.isCompleted
                              ? 'bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {item.isCompleted ? '✓ Mark Incomplete' : 'Mark Complete'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Export Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex gap-3"
      >
        <motion.button
          onClick={exportSummary}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export Readiness Summary
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all border border-gray-700"
          onClick={() => {
            setState((prev) => ({
              ...prev,
              items: prev.items.map((item) => ({ ...item, isCompleted: false })),
            }));
            setExpandedItems(new Set());
          }}
        >
          <AlertCircle className="w-4 h-4" />
          Reset
        </motion.button>
      </motion.div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 text-sm text-gray-300"
      >
        <div className="flex gap-3">
          <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-300 mb-1">How to use this checker:</p>
            <ol className="space-y-1 text-xs list-decimal list-inside">
              <li>Adjust the hectare slider to match your forest area</li>
              <li>Review each checklist item and expand to see generated draft text</li>
              <li>Copy the draft text and customize it with your specific data</li>
              <li>Mark items as complete as you prepare them</li>
              <li>Export the summary when ready for submission</li>
              <li>Submit your complete application before April 4, 2026</li>
            </ol>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GrantReadiness;
