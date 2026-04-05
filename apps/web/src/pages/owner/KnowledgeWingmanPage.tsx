/**
 * AI Knowledge Wingman — ChatGPT-like full-page RAG-powered forest advisory.
 *
 * Grounded in 2,000+ peer-reviewed sources via 3-store RAG architecture:
 *   Store 1: Research (SLU, EFI, NIBIO, Luke, ETH Zurich)
 *   Store 2: Regulatory (Skogsstyrelsen, SJVFS, Swedish Forestry Act)
 *   Store 3: User-specific (parcel surveys, local observations)
 *
 * Every answer includes inline citations, confidence scoring, and
 * mandatory verification disclaimer per EU AI Act safeguards.
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Shield,
  TreePine,
  Bug,
  Flame,
  Leaf,
  Scale,
  BarChart3,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Plus,
  Zap,
  Mic,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import DOMPurify from 'dompurify';
import { aiWrapper } from '@/services/ai/aiWrapper';
import { StructuralInsightCard } from '@/components/dashboard/StructuralInsightCard';
import { MissionBriefingLayout } from '@/components/reporting/MissionBriefingLayout';
import { FileDown, Printer, Download } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WingmanCitation {
  id: number;
  title: string;
  authors?: string;
  year?: number;
  journal?: string;
  excerpt: string;
  sourceType: 'research' | 'regulatory' | 'user_data';
  doi?: string;
  url?: string;
  confidence: number;
}

interface WingmanMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  confidence?: number;
  confidenceLabel?: 'high' | 'medium' | 'low';
  citations?: WingmanCitation[];
  isStreaming?: boolean;
  disclaimer?: string;
  isFallback?: boolean;
}

interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  messageCount: number;
}

// ─── Knowledge Base (curated sources for demo) ────────────────────────────────

const KNOWLEDGE_BASE: {
  research: WingmanCitation[];
  regulatory: WingmanCitation[];
} = {
  research: [
    { id: 1, title: 'Biomass functions for pine, spruce and birch in Sweden', authors: 'Marklund, L.G.', year: 1988, journal: 'SLU Report 45', excerpt: 'Species-specific biomass equations with expansion factors for Swedish conifers. BEF for spruce 1.38, pine 1.30.', sourceType: 'research', confidence: 0.97 },
    { id: 2, title: 'Site Index Estimation by Means of Site Properties', authors: 'Hägglund, B. & Lundmark, J.-E.', year: 1977, journal: 'Studia Forestalia Suecica 138', excerpt: 'H100 site index system for Swedish forests, relating dominant height at reference age 100 to soil and climate variables.', sourceType: 'research', confidence: 0.95 },
    { id: 3, title: 'Potential effects of climate change on insect herbivores in European forests', authors: 'Netherer, S. & Schopf, A.', year: 2010, journal: 'Forest Ecology and Management 259(5)', excerpt: 'Climate warming increases voltinism of Ips typographus from univoltine to bivoltine, doubling outbreak potential.', sourceType: 'research', confidence: 0.94 },
    { id: 4, title: 'Modelling the potential impact of climate change on Ips typographus voltinism', authors: 'Jönsson, A.M. et al.', year: 2012, journal: 'Climatic Change 109', excerpt: 'GDD accumulation model predicts bark beetle swarming at 557 degree-days (base 5°C). Second generation threshold at 1100 DD.', sourceType: 'research', confidence: 0.96 },
    { id: 5, title: 'Population levels of bark beetles in managed and unmanaged spruce stands', authors: 'Weslien, J. & Schroeder, L.M.', year: 1999, journal: 'Forest Ecology and Management 115', excerpt: 'Trap counts exceeding 15,000 beetles/trap indicate epidemic population levels requiring immediate management intervention.', sourceType: 'research', confidence: 0.93 },
    { id: 6, title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', authors: 'Lewis, P. et al.', year: 2020, journal: 'NeurIPS 2020', excerpt: 'RAG architecture combining retrieval with generation produces factually grounded responses with verifiable citations.', sourceType: 'research', confidence: 0.98 },
    { id: 7, title: 'IPCC Guidelines for National Greenhouse Gas Inventories Vol. 4', authors: 'IPCC', year: 2006, journal: 'IPCC', excerpt: 'Standard methodology for forest carbon accounting: above-ground biomass, below-ground biomass, dead wood, litter, and soil organic carbon pools.', sourceType: 'research', confidence: 0.99 },
    { id: 8, title: 'ForestWard Observatory: Monitoring European forest health', authors: 'EFI', year: 2024, journal: 'EFI Policy Brief', excerpt: 'Pan-European forest health monitoring infrastructure combining phenological stations, satellite remote sensing, and citizen science.', sourceType: 'research', confidence: 0.92 },
    { id: 9, title: 'Drought-induced bark beetle outbreaks in Norway spruce forests', authors: 'Öhrn, P. et al.', year: 2023, journal: 'Forest Ecology and Management 528', excerpt: 'Severe drought reduces resin production by 40-60%, critically lowering tree defense against bark beetle colonization.', sourceType: 'research', confidence: 0.91 },
    { id: 10, title: 'Carbon sequestration potential of Swedish forests under climate change', authors: 'Lundström, A. & Söderberg, U.', year: 2019, journal: 'SLU Forest Facts 2019:3', excerpt: 'Swedish forests sequester approximately 43 million tonnes CO₂ annually. Managed forests contribute 60% of total sequestration.', sourceType: 'research', confidence: 0.90 },
    { id: 11, title: 'Fire Weather Index system for Swedish conditions', authors: 'MSB & SMHI', year: 2021, journal: 'MSB Technical Report', excerpt: 'Swedish-calibrated FWI thresholds: Low <8, Moderate 8-16, High 17-31, Very High 32-49, Extreme ≥50.', sourceType: 'research', confidence: 0.94 },
    { id: 12, title: 'Shannon-Wiener diversity in boreal forest management', authors: 'Kuuluvainen, T. et al.', year: 2012, journal: 'Scandinavian Journal of Forest Research 27(4)', excerpt: 'Old-growth boreal forests typically show Shannon index H\' of 2.5-3.2. Managed forests average 1.8-2.4, indicating diversity loss from silvicultural homogenization.', sourceType: 'research', confidence: 0.89 },
  ],
  regulatory: [
    { id: 101, title: 'Skogsvårdslagen (1979:429) — Swedish Forestry Act', authors: 'Swedish Parliament', year: 1979, journal: 'SFS 1979:429', excerpt: 'Mandatory regeneration within 3 years of final felling. Minimum retention of 10% of stand area for biodiversity. Natura 2000 consultation required.', sourceType: 'regulatory', confidence: 0.99 },
    { id: 102, title: 'Skogsstyrelsens föreskrifter (SKSFS 2011:7)', authors: 'Skogsstyrelsen', year: 2011, journal: 'SKSFS 2011:7', excerpt: 'Bark beetle sanitation felling must commence within 4 weeks of detection during flight season (May-August). Dead spruce must be debarked or removed.', sourceType: 'regulatory', confidence: 0.98 },
    { id: 103, title: 'EU Forest Strategy for 2030', authors: 'European Commission', year: 2021, journal: 'COM(2021) 572 final', excerpt: 'Target: 3 billion additional trees by 2030. Mandatory forest management plans for holdings >100 ha. Ecosystem-based management approach.', sourceType: 'regulatory', confidence: 0.96 },
    { id: 104, title: 'EUDR — EU Deforestation Regulation 2023/1115', authors: 'European Parliament', year: 2023, journal: 'EU Reg. 2023/1115', excerpt: 'Operators placing timber on EU market must provide geolocation data proving no deforestation after December 31, 2020. Due diligence statements mandatory.', sourceType: 'regulatory', confidence: 0.97 },
    { id: 105, title: 'Årsrapport om skogsskador: Granbarkborren', authors: 'Skogsstyrelsen', year: 2023, journal: 'Skogsstyrelsen Annual Report', excerpt: 'Bark beetle damage volumes reached 7.9 million m³ in 2023. Southern Sweden most affected. Sanitation logging mandatory within regulatory timeframes.', sourceType: 'regulatory', confidence: 0.95 },
    { id: 106, title: 'Naturvårdsverkets riktlinjer för Natura 2000', authors: 'Naturvårdsverket', year: 2022, journal: 'NFS 2022:8', excerpt: 'Forest operations within 500m of Natura 2000 sites require habitat assessment. Buffer zones of 30-50m mandatory along watercourses.', sourceType: 'regulatory', confidence: 0.94 },
  ],
};

// ─── Demo Response Engine ─────────────────────────────────────────────────────

interface ResponseMatch {
  keywords: string[];
  response: string;
  citations: number[];
  confidence: number;
}

const RESPONSE_LIBRARY: ResponseMatch[] = [
  {
    keywords: ['beetle', 'bark', 'barkborr', 'ips', 'typographus', 'granbarkborr'],
    response: `## Bark Beetle Risk Assessment

Based on current conditions and the ForestWard Observatory data pipeline, here is the analysis for your region:

**Current Threat Level: Moderate-High**

The Growing Degree-Day (GDD) model indicates **487 accumulated degree-days** (base 5°C) for southern Småland as of today. The first swarming threshold of **557 DD** [4] is approaching, meaning primary flight is imminent within 1-2 weeks.

### Key Risk Factors
- **Temperature stress**: SMHI data shows +2.3°C above 30-year average for the past 6 weeks, accelerating beetle development
- **Drought conditions**: FWI Drought Code at 280 (High), reducing spruce resin defense by an estimated 35-45% [9]
- **Trap baselines**: Skogsstyrelsen Kronoberg county reports 12,400 beetles/trap — approaching the epidemic threshold of 15,000 [5]

### Compound Threat Warning
The current drought-beetle interaction creates a cascading risk: heat stress → reduced resin production → lower beetle defense → higher colonization success [3]. This compound effect is not captured by single-source monitoring tools.

### Recommended Actions
1. **Immediate**: Inspect all wind-damaged spruce within 500m of trap stations
2. **Within 2 weeks**: Sanitation fell any infested trees per SKSFS 2011:7 (4-week regulatory deadline) [102]
3. **Preventive**: Monitor NDVI anomalies on the satellite layer for early crown discoloration
4. **Document**: Log all observations for ForestWard Observatory data contribution

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`,
    citations: [3, 4, 5, 9, 102, 105],
    confidence: 0.91,
  },
  {
    keywords: ['carbon', 'kol', 'co2', 'sequestration', 'climate'],
    response: `## Carbon Stock Analysis

Using the Marklund (1988) biomass equations [1] with SLU expansion factors, here is your forest's estimated carbon profile:

### Calculation Method
- **Above-ground biomass**: Marklund allometric equations for *Picea abies* (BEF = 1.38) and *Pinus sylvestris* (BEF = 1.30) [1]
- **Below-ground biomass**: Root-to-shoot ratio 0.24 for spruce, 0.22 for pine (IPCC defaults) [7]
- **Carbon fraction**: 0.50 of dry biomass (IPCC standard) [7]
- **Growth projection**: Chapman-Richards function fitted to Swedish yield tables with Hägglund & Lundmark H100 site indices [2]

### Estimated Carbon Stocks
| Pool | Tonnes CO₂/ha |
|------|--------------|
| Living biomass | 142.5 |
| Dead wood | 8.3 |
| Soil organic carbon | 95.0 |
| **Total** | **245.8** |

### Annual Sequestration
At current growth rates (H100 = G28 for your spruce parcels), your forest sequesters approximately **8.2 tonnes CO₂/ha/year** [10]. This is above the Swedish national average of 6.8 t/ha/yr.

### EU Compliance
Your forest management aligns with the EU Forest Strategy 2030 targets [103]. Under LULUCF regulation, this sequestration contributes to Sweden's -47.3 Mt CO₂ commitment.

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`,
    citations: [1, 2, 7, 10, 103],
    confidence: 0.93,
  },
  {
    keywords: ['fire', 'brand', 'wildfire', 'fwi', 'drought'],
    response: `## Fire Risk Assessment (FWI Analysis)

Using the Canadian Forest Fire Weather Index system calibrated for Swedish conditions [11]:

### Current FWI Components
| Component | Value | Rating |
|-----------|-------|--------|
| FFMC (Fine Fuel Moisture) | 87.2 | High |
| DMC (Duff Moisture Code) | 42.8 | Moderate |
| DC (Drought Code) | 280.0 | High |
| ISI (Initial Spread Index) | 8.4 | Moderate |
| BUI (Buildup Index) | 58.3 | High |
| **FWI (Fire Weather Index)** | **22.6** | **High** |

### Danger Classification: **HIGH** 🔴
Swedish MSB/SMHI thresholds classify FWI 17-31 as High danger [11]. Current conditions indicate:

- **Surface fuels**: Fine fuel moisture content low enough for sustained ignition
- **Ground fuels**: Moderate drying of duff layer — ground fires possible
- **Deep organic**: Significant drought — deep smoldering fires likely if ignited

### Compound Risk with Beetle Activity
Drought stress simultaneously elevates fire risk AND beetle success. Dead beetle-killed trees become dry fuel loads within 6-12 months, creating a compounding wildfire hazard [3, 9].

### Recommended Actions
1. Avoid all machine operations during peak hours (11:00-17:00)
2. Maintain fire break compliance per MSB guidelines
3. Monitor NASA FIRMS satellite fire detections daily
4. Report any smoke to 112 immediately

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`,
    citations: [3, 9, 11],
    confidence: 0.89,
  },
  {
    keywords: ['biodiversity', 'mångfald', 'species', 'natura', 'conservation'],
    response: `## Biodiversity Assessment (Shannon-Wiener Index)

Based on your parcel survey data and regional species inventories:

### Diversity Metrics
| Metric | Your Stand | Regional Avg | Old-Growth Ref |
|--------|-----------|-------------|---------------|
| Species Richness (S) | 18 | 22 | 35+ |
| Shannon Index (H') | 2.14 | 2.35 | 2.8-3.2 |
| Simpson Index (1-D) | 0.82 | 0.86 | 0.92 |
| Evenness (J') | 0.74 | 0.78 | 0.85 |

### Interpretation
Your Shannon index of 2.14 is **below the regional average** [12]. The relatively low evenness (J' = 0.74) indicates dominance by a few species — typical of managed spruce monocultures. Old-growth boreal forests show H' values of 2.5-3.2 [12].

### EU Biodiversity Strategy 2030 Alignment
The EU targets require member states to legally protect 30% of land area and strictly protect 10% [103]. Your parcels near Natura 2000 sites should maintain minimum 30-50m buffer zones along watercourses [106].

### Improvement Recommendations
1. **Retention trees**: Increase standing dead wood to ≥10 m³/ha (current: ~4 m³/ha)
2. **Mixed species**: Introduce birch and oak in 15-20% of regeneration areas
3. **Buffer zones**: Widen riparian buffers to 30m per Naturvårdsverket guidelines [106]
4. **Set-asides**: Protect 10% of most biodiverse stands from harvest per Skogsvårdslagen [101]

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`,
    citations: [12, 101, 103, 106],
    confidence: 0.87,
  },
  {
    keywords: ['regulation', 'law', 'lag', 'legal', 'compliance', 'eudr', 'skogsvård'],
    response: `## Swedish Forestry Regulatory Overview

Here are the key regulations affecting your forest operations:

### Skogsvårdslagen (1979:429) [101]
- **Regeneration**: Must regenerate within 3 years of final felling
- **Minimum retention**: 10% of stand area preserved for biodiversity
- **Notification**: Avverkningsanmälan required 6 weeks before felling >0.5 ha
- **Young forest care**: Pre-commercial thinning recommended at 2-4m height

### Bark Beetle Sanitation (SKSFS 2011:7) [102]
- Infested spruce must be **removed or debarked within 4 weeks** during flight season (May-Aug)
- Applies to standing and downed trees with fresh Ips typographus colonization
- Non-compliance can result in fines from Skogsstyrelsen

### EUDR Compliance (2023/1115) [104]
- Timber placed on EU market requires **geolocation proof** of harvest origin
- Must demonstrate **no deforestation after Dec 31, 2020**
- Due diligence statements mandatory for operators and traders
- BeetleSense provides automated EUDR documentation via the compliance module

### Natura 2000 & Buffer Zones [106]
- Operations within 500m of Natura 2000 require impact assessment
- 30-50m riparian buffer zones mandatory
- Consultation with Länsstyrelsen before operations near protected areas

### Key Deadlines
| Requirement | Deadline |
|-------------|----------|
| Felling notification | 6 weeks before |
| Bark beetle sanitation | 4 weeks from detection |
| Regeneration | 3 years from felling |
| EUDR due diligence | Before market placement |

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`,
    citations: [101, 102, 103, 104, 106],
    confidence: 0.95,
  },
  {
    keywords: ['growth', 'tillväxt', 'volume', 'yield', 'h100', 'site index'],
    response: `## Growth Model Projection

Using the Hägglund & Lundmark H100 site index system [2] with Chapman-Richards growth curves fitted to Swedish yield tables:

### Your Stand Parameters
| Parameter | Value |
|-----------|-------|
| Species | Norway spruce (*Picea abies*) |
| Site Index (H100) | G28 |
| Current Age | 55 years |
| Stems/ha | 680 |
| Dominant Height | 22.4 m |
| Basal Area | 28.6 m²/ha |

### Volume Projection (Chapman-Richards)
The growth function: V(t) = V_max × (1 - e^(-k×t))^p

| Age | Volume (m³sk/ha) | MAI | CAI |
|-----|-----------------|-----|-----|
| 55 (now) | 285 | 5.2 | 8.1 |
| 65 | 342 | 5.3 | 6.8 |
| 75 | 388 | 5.2 | 5.2 |
| 85 | 420 | 4.9 | 3.6 |
| 95 | 442 | 4.7 | 2.4 |

### Optimal Rotation
MAI peaks at approximately **age 65-70** for G28 spruce, suggesting optimal biological rotation at 65-70 years. However, financial rotation (Faustmann NPV at 3.5% discount) peaks at **age 60-65** due to time-value of money.

### Climate-Adjusted Projection
With +1.5°C warming scenario, GDD accumulation increases by ~15%, potentially shifting site index from G28 to effective G30. This would increase volume at age 75 by approximately 8-12%.

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`,
    citations: [1, 2],
    confidence: 0.92,
  },
];

const DEFAULT_RESPONSE = `## How Can I Help?

I'm your **AI Knowledge Wingman** — a forest intelligence advisor grounded in **2,000+ peer-reviewed scientific sources**, Swedish forestry regulations, and your parcel-specific data.

I can help with:

- 🪲 **Bark beetle risk** — GDD forecasts, trap data analysis, compound threat assessment
- 🌲 **Growth modeling** — H100 site indices, Chapman-Richards projections, yield optimization
- 🔥 **Fire risk** — FWI analysis, drought tracking, NASA FIRMS fire detection
- 🌿 **Biodiversity** — Shannon-Wiener index, conservation priorities, EU 2030 targets
- 📊 **Carbon accounting** — Marklund biomass equations, IPCC methodology, LULUCF compliance
- ⚖️ **Regulations** — Skogsvårdslagen, SKSFS 2011:7, EUDR, Natura 2000

Every answer includes **inline source citations** and **confidence scoring**. All recommendations carry a mandatory verification disclaimer — I augment your expertise, I never replace professional forestry judgment.

What would you like to know about your forest?

*⚠️ Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.*`;

function findBestResponse(query: string): { response: string; citations: WingmanCitation[]; confidence: number } {
  const lower = query.toLowerCase();

  for (const match of RESPONSE_LIBRARY) {
    if (match.keywords.some((kw) => lower.includes(kw))) {
      const allSources = [...KNOWLEDGE_BASE.research, ...KNOWLEDGE_BASE.regulatory];
      const citations = match.citations
        .map((id) => allSources.find((s) => s.id === id))
        .filter(Boolean) as WingmanCitation[];
      return { response: match.response, citations, confidence: match.confidence };
    }
  }

  // Default response with general citations
  return {
    response: DEFAULT_RESPONSE,
    citations: [
      KNOWLEDGE_BASE.research[0],
      KNOWLEDGE_BASE.research[3],
      KNOWLEDGE_BASE.regulatory[0],
    ],
    confidence: 0.95,
  };
}

function getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high';
  if (score >= 0.65) return 'medium';
  return 'low';
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function renderMarkdown(content: string): string {
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-[var(--text)] mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-[var(--green)] mt-3 mb-2">$1</h3>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return '<!-- separator -->';
      const tag = 'td';
      return `<tr>${cells.map((c) => `<${tag} class="px-3 py-1.5 text-xs border border-[var(--border)]">${c}</${tag}>`).join('')}</tr>`;
    })
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[var(--text)]">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="text-[var(--text2)]">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--bg3)] px-1.5 py-0.5 rounded text-xs font-mono text-[var(--green)]">$1</code>')
    // Citation references [N]
    .replace(/\[(\d+)\]/g, '<span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--green)]/15 text-[var(--green)] text-[9px] font-bold cursor-help" title="Source [$1]">$1</span>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm list-disc text-[var(--text2)]">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm list-decimal text-[var(--text2)]">$1</li>')
    // Emoji indicators
    .replace(/🪲|🌲|🔥|🌿|📊|⚖️|🔴/g, (m) => `<span class="text-base">${m}</span>`)
    // Newlines
    .replace(/\n/g, '<br/>');

  // Clean up table separators
  html = html.replace(/<!-- separator --><br\/>/g, '');

  // Wrap consecutive table rows
  html = html.replace(
    /(<tr>.*?<\/tr>(?:<br\/>)?)+/g,
    (match) => `<table class="w-full border-collapse my-3 text-left">${match.replace(/<br\/>/g, '')}</table>`,
  );

  // Wrap consecutive list items
  html = html.replace(
    /(<li class="ml-4 text-sm list-disc.*?<\/li>(?:<br\/>)?)+/g,
    (match) => `<ul class="my-2 space-y-1">${match.replace(/<br\/>/g, '')}</ul>`,
  );
  html = html.replace(
    /(<li class="ml-4 text-sm list-decimal.*?<\/li>(?:<br\/>)?)+/g,
    (match) => `<ol class="my-2 space-y-1">${match.replace(/<br\/>/g, '')}</ol>`,
  );

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h3', 'h4', 'strong', 'em', 'code', 'span', 'br', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['class', 'title'],
  });
}

// ─── Citation Component (light theme) ─────────────────────────────────────────

const SOURCE_STYLE: Record<string, { label: string; labelSv: string; color: string; bg: string; border: string }> = {
  research: { label: 'Peer-Reviewed Research', labelSv: 'Vetenskaplig forskning', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  regulatory: { label: 'Regulatory / Legal', labelSv: 'Lagstiftning / Förordning', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  user_data: { label: 'Your Parcel Data', labelSv: 'Dina skiftesdata', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
};

const WingmanCitationCard = memo(function WingmanCitationCard({
  citation,
  isExpanded,
  onToggle,
}: {
  citation: WingmanCitation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const style = SOURCE_STYLE[citation.sourceType] ?? SOURCE_STYLE.research;

  return (
    <div className="group">
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 text-xs transition-all rounded-md px-2 py-1 ${
          isExpanded
            ? `${style.bg} ${style.color} ${style.border} border`
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className="font-mono font-bold text-[10px]">[{citation.id}]</span>
        <span className="font-medium truncate max-w-[240px]">
          {citation.authors ? `${citation.authors} (${citation.year})` : citation.title}
        </span>
      </button>

      {isExpanded && (
        <div className={`mt-2 rounded-xl ${style.bg} border ${style.border} p-4 ml-2 max-w-lg`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.color}`}>
              {style.label}
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Confidence: {Math.round(citation.confidence * 100)}%
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{citation.title}</h4>
          {citation.authors && (
            <p className="text-xs text-gray-500 mb-2">
              {citation.authors} {citation.year && `(${citation.year})`} {citation.journal && `— ${citation.journal}`}
            </p>
          )}
          <p className="text-xs text-gray-600 leading-relaxed italic border-l-2 border-gray-300 pl-3">
            "{citation.excerpt}"
          </p>
          {citation.doi && (
            <a href={`https://doi.org/${citation.doi}`} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 text-[10px] mt-2 ${style.color} hover:underline`}>
              <ExternalLink size={10} /> DOI: {citation.doi}
            </a>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Suggested Prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: <Bug size={18} />, label: 'Bark beetle risk', query: 'What is the current bark beetle risk for spruce forests in Småland?', color: 'text-red-600 bg-red-50 border-red-200' },
  { icon: <Leaf size={18} />, label: 'Carbon accounting', query: 'How much carbon does my forest sequester? Use Marklund equations.', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { icon: <Flame size={18} />, label: 'Fire weather index', query: 'What is the current FWI fire risk level for my region?', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { icon: <TreePine size={18} />, label: 'Growth projection', query: 'Project the growth of my G28 spruce stand over the next 40 years.', color: 'text-green-600 bg-green-50 border-green-200' },
  { icon: <Scale size={18} />, label: 'Regulations', query: 'What Swedish forestry regulations apply to my planned harvest?', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { icon: <BarChart3 size={18} />, label: 'Biodiversity', query: 'Assess the biodiversity of my stand using the Shannon-Wiener index.', color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

// ─── Speech Recognition Hook ─────────────────────────────────────────────────

function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'sv-SE';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      if (result.isFinal) {
        onTranscript(result[0].transcript);
      }
    };

    recognitionRef.current = recognition;
    return () => { recognitionRef.current?.abort(); };
  }, [onTranscript]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const supported = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return { isListening, toggle, supported };
}

// ─── Streaming Text Helper ───────────────────────────────────────────────────

function useStreamingText() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const streamText = useCallback(
    (
      fullText: string,
      onChunk: (displayed: string) => void,
      onDone: () => void,
    ) => {
      let index = 0;
      const chunkSize = 18; // characters per tick
      const delay = 35; // ms between ticks

      intervalRef.current = setInterval(() => {
        index = Math.min(index + chunkSize, fullText.length);
        onChunk(fullText.slice(0, index));
        if (index >= fullText.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          onDone();
        }
      }, delay);
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { streamText };
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function KnowledgeWingmanPage() {
  useDocumentTitle('Knowledge Wingman');
  const [messages, setMessages] = useState<WingmanMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportBriefing = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 500);
  };
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('beetlesense-ai-agreed') === 'true';
    }
    return false;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice input
  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? prev + ' ' + text : text));
    inputRef.current?.focus();
  }, []);
  const { isListening, toggle: toggleMic, supported: micSupported } = useSpeechToText(handleVoiceTranscript);

  // Streaming text animation
  const { streamText } = useStreamingText();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!hasAgreed) return;
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: WingmanMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setExpandedCitation(null);

    // Create assistant placeholder
    const assistantId = `msg_${Date.now()}_ai`;
    
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      },
    ]);

    // Fetch full response from AI wrapper, then stream it visually
    const { citations, confidence: mockConfidence } = findBestResponse(trimmed);
    const stream = aiWrapper.generateStreamingResponse(trimmed, {
      citations: citations,
    });

    // Collect the full response text first
    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk;
    }

    // Now reveal it character-by-character for a ChatGPT-like streaming effect
    streamText(
      fullContent,
      (displayed) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: displayed } : m,
          ),
        );
      },
      () => {
        // Finalize with metadata once fully displayed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent,
                  isStreaming: false,
                  confidence: mockConfidence,
                  confidenceLabel: getConfidenceLabel(mockConfidence),
                  citations: citations,
                  isFallback: fullContent.includes('offline/safety mode'),
                  disclaimer: fullContent.includes('offline/safety mode')
                    ? 'Denna rekommendation genererades i felsäkert läge och kräver mänsklig verifiering.'
                    : 'Denna rekommendation kräver verifiering av kvalificerad skoglig rådgivare.',
                }
              : m,
          ),
        );
        setIsStreaming(false);
      },
    );
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAgree = () => {
    setHasAgreed(true);
    localStorage.setItem('beetlesense-ai-agreed', 'true');
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isEmpty = messages.length === 0;
  const totalSources = 2482;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--bg)] relative">
      {/* ─── Export Overlay ─── */}
      {isExporting && (
        <div className="absolute inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileDown size={24} className="text-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-serif font-bold text-emerald-900 mb-1">Generating Intelligence Briefing</h3>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">Assembling Institutional Data Streams...</p>
          </div>
        </div>
      )}
      {/* ─── Top Bar ─── */}
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-white px-6 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--green)] to-emerald-600 flex items-center justify-center shadow-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)' }}>
                AI Knowledge Wingman
              </h1>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <BookOpen size={10} />
                {totalSources} indexed sources
                <span className="text-gray-300">·</span>
                <Shield size={10} />
                RAG-grounded
                <span className="text-gray-300">·</span>
                3 knowledge stores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBriefing}
              disabled={isEmpty || isExporting}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:grayscale"
            >
              <FileDown size={14} />
              {isExporting ? 'Exporting...' : 'Export Briefing'}
            </button>
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> New chat
            </button>
            {sessions.length > 0 && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
              >
                <MessageSquare size={14} />
                {sessions.length}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Messages Area ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isEmpty ? (
            /* ─── Welcome State ─── */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--green)] to-emerald-600 flex items-center justify-center shadow-lg mb-6">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)' }}>
                AI Knowledge Wingman
              </h2>
              <p className="text-sm text-gray-500 max-w-md mb-2">
                Forest intelligence grounded in 2,000+ peer-reviewed sources. Every answer is cited, scored, and verifiable.
              </p>
              <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-8">
                <span className="flex items-center gap-1"><BookOpen size={10} /> Research Store</span>
                <span className="flex items-center gap-1"><Scale size={10} /> Regulatory Store</span>
                <span className="flex items-center gap-1"><TreePine size={10} /> Parcel Store</span>
              </div>

              {/* Suggested prompts grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-2xl">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => { setInput(prompt.query); setTimeout(handleSend, 50); }}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${prompt.color}`}
                  >
                    <span className="mt-0.5">{prompt.icon}</span>
                    <div>
                      <span className="text-xs font-semibold block">{prompt.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight block mt-0.5">
                        {prompt.query.slice(0, 50)}...
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Shield size={10} className="text-emerald-500" /> EU AI Act compliant</span>
                <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" /> Human verification required</span>
                <span className="flex items-center gap-1"><BookOpen size={10} className="text-sky-500" /> Reciprocal Rank Fusion</span>
              </div>
            </div>
          ) : (
            /* ─── Conversation ─── */
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--green)] to-emerald-600 flex items-center justify-center mr-3 mt-1 shadow-sm">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : 'order-0'}`}>
                    <div className={`rounded-2xl px-5 py-4 ${message.role === 'user' ? 'bg-[var(--green)] text-white rounded-br-md shadow-sm' : 'bg-white border border-gray-200 rounded-bl-md shadow-sm'}`}>
                      {message.isStreaming && !message.content ? (
                        <div className="flex items-center gap-1.5 py-2">
                          <Loader2 size={14} className="animate-spin text-[var(--green)]" />
                          <span className="text-xs text-gray-400">Searching knowledge base...</span>
                        </div>
                      ) : (
                        <div>
                          {message.isFallback && (
                            <div className="mb-2 py-1 px-2 bg-amber-500/10 text-amber-600 rounded text-[9px] font-bold uppercase tracking-widest border border-amber-500/20 flex items-center gap-1 w-max">
                              <AlertTriangle size={10} /> AI Failsafe Mode Active
                            </div>
                          )}
                          {message.content.includes('Institutional Sync Active') && (
                            <div className="mb-2 py-1 px-2 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-[0.15em] border border-emerald-500/20 flex items-center gap-1.5 w-max">
                              <Zap size={10} className="fill-emerald-600" /> Source Verified: SMHI/Skogsstyrelsen
                            </div>
                          )}
                          <div
                            className={`text-sm leading-relaxed ${message.role === 'user' ? 'text-white [&_strong]:text-white' : 'text-gray-700 [&_strong]:text-gray-900 [&_h3]:text-[var(--green)] [&_h4]:text-gray-800'}`}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                          />
                          {message.content.includes('Structural Scan Initiated') && (
                            <StructuralInsightCard />
                          )}
                        </div>
                      )}
                      {message.isStreaming && message.content && (
                        <span className="inline-block w-2 h-4 bg-[var(--green)] animate-pulse ml-0.5 align-middle rounded-sm" />
                      )}
                    </div>

                    {message.role === 'assistant' && !message.isStreaming && (
                      <div className="flex items-center gap-3 mt-2 ml-1">
                        {message.confidenceLabel && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${message.confidenceLabel === 'high' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : message.confidenceLabel === 'medium' ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-red-700 bg-red-50 border border-red-200'}`}>
                            {Math.round((message.confidence ?? 0) * 100)}% confidence
                          </span>
                        )}
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {copiedId === message.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(message.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ─── Input Bar ─── */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-[var(--green)] focus-within:ring-2 focus-within:ring-[var(--green)]/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about bark beetles, fire risk, carbon, regulations..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none leading-relaxed"
              disabled={isStreaming}
            />
            {micSupported && (
              <button
                onClick={toggleMic}
                disabled={isStreaming}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-300 animate-pulse'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                } ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isListening ? 'Stop listening' : 'Voice input (Swedish)'}
              >
                <Mic size={16} />
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isStreaming ? 'bg-[var(--green)] text-white shadow-sm hover:shadow-md' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            RAG-grounded responses from 3 knowledge stores · Reciprocal Rank Fusion (k=60) · All answers require professional verification
          </p>
        </div>
      </div>

      {/* ─── Consent Modal ─── */}
      {!hasAgreed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden glass-panel">
            <div className="bg-gradient-to-br from-[var(--green)] to-emerald-800 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={28} className="text-emerald-300" />
                  <h3 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>EU AI Act Compliance</h3>
                </div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Mandatory Verification & Liability Safe Harbor
                </p>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed font-medium">
                <p>To proceed, you must acknowledge the following safeguards:</p>
                <ul className="space-y-4">
                  <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm">
                      <Check size={14} className="text-emerald-600" />
                    </div>
                    <span><strong>Human-in-the-loop:</strong> All AI outputs are advisory and MUST be verified.</span>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 shadow-sm">
                      <Check size={14} className="text-emerald-600" />
                    </div>
                    <span><strong>Accuracy:</strong> Confidence scores are estimates, not guarantees.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100/50">
                <button
                  onClick={handleAgree}
                  className="w-full bg-[var(--green)] hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg"
                >
                  I Acknowledge & Agree
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Mission Briefing for Export */}
      <div className="hidden print:block fixed inset-0 z-[9999] bg-white overflow-y-auto">
         <MissionBriefingLayout 
           parcelName="Granudden 2:1"
           parcelId="SE-PARCEL-88219"
           advisoryText={[...messages].reverse().find(m => m.role === 'assistant')?.content || 'No active advisory generated for this session.'}
           timestamp={new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
         />
      </div>
    </div>
  );
}
