/**
 * Compliance Report Service
 *
 * Generates self-assessment compliance reports for Swedish forest owners
 * against EUDR, FSC, PEFC, and the Swedish Forestry Act.
 *
 * NOTE: These are self-assessment tools only.
 * Official compliance verification requires a certified forester.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplianceFramework = 'EUDR' | 'FSC' | 'PEFC' | 'Swedish_Forestry_Act';

export type CheckStatus = 'pass' | 'fail' | 'warning' | 'unknown';

export interface ComplianceCheck {
  id: string;
  requirement: string;
  description: string;
  status: CheckStatus;
  evidence: string;
  recommendation?: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  parcelId: string;
  parcelName: string;
  farmName: string;
  generatedAt: string;
  checks: ComplianceCheck[];
  overallStatus: 'PASS' | 'FAIL' | 'NEEDS_ATTENTION';
  passCount: number;
  failCount: number;
  warningCount: number;
  unknownCount: number;
  summary: string;
}

export interface ParcelComplianceInput {
  parcelId: string;
  parcelName: string;
  farmName: string;
  areaHa: number;
  species: string;
  registeredAt: string;          // ISO date
  hasGeodata: boolean;
  hasLegalRightsDoc: boolean;
  municipalityCode?: string;
  lastHarvestYear?: number | null;
  annualHarvestM3?: number | null;
  sustainableHarvestM3?: number | null;
  nearProtectedArea?: boolean;
}

// ─── Framework check generators ──────────────────────────────────────────────

function eudrChecks(input: ParcelComplianceInput): ComplianceCheck[] {
  const regDate = new Date(input.registeredAt);
  const cutoff = new Date('2020-12-31');
  const preDeforestation = regDate <= cutoff;

  const harvestWithinLimits =
    input.annualHarvestM3 != null && input.sustainableHarvestM3 != null && input.sustainableHarvestM3 > 0
      ? input.annualHarvestM3 <= input.sustainableHarvestM3
      : null;

  return [
    {
      id: 'eudr-1',
      requirement: 'No deforestation after 31 December 2020',
      description:
        'The parcel must not have been deforested after the EUDR baseline date of 31 Dec 2020 (EU Regulation 2023/1115, Art. 2).',
      status: preDeforestation ? 'pass' : 'warning',
      evidence: preDeforestation
        ? `Parcel registered ${input.registeredAt} — prior to the EUDR baseline date. Satellite record available.`
        : `Parcel registered after baseline. Manual verification of land-use change may be required.`,
      recommendation: preDeforestation
        ? undefined
        : 'Provide satellite imagery or cadastral records confirming forest cover pre-Jan 2021.',
    },
    {
      id: 'eudr-2',
      requirement: 'Geolocation data available',
      description:
        'Operators placing forest products on the EU market must be able to supply parcel coordinates (polygon or point) (Art. 9).',
      status: input.hasGeodata ? 'pass' : 'fail',
      evidence: input.hasGeodata
        ? 'Parcel boundary recorded in BeetleSense with GPS coordinates.'
        : 'No parcel boundary recorded.',
      recommendation: input.hasGeodata ? undefined : 'Add parcel boundary in the Parcels section of BeetleSense.',
    },
    {
      id: 'eudr-3',
      requirement: 'Legal harvesting rights confirmed',
      description:
        'Documentation showing legal right to harvest (ownership, lease, or felling permit) must be on record (Art. 10).',
      status: input.hasLegalRightsDoc ? 'pass' : 'unknown',
      evidence: input.hasLegalRightsDoc
        ? 'Legal rights document uploaded to Document Vault.'
        : 'No harvesting rights document found in Document Vault.',
      recommendation: input.hasLegalRightsDoc
        ? undefined
        : 'Upload ownership certificate, lease agreement, or latest Skogsstyrelsen felling permit to Document Vault.',
    },
    {
      id: 'eudr-4',
      requirement: 'No protected species habitat conflict',
      description:
        'The parcel must not overlap with critical habitat for EU-listed species (Habitats Directive Annex I & II).',
      status: input.nearProtectedArea ? 'warning' : 'pass',
      evidence: input.nearProtectedArea
        ? 'Parcel is within or adjacent to a registered Natura 2000 area. Detailed habitat survey recommended.'
        : 'No overlap with known protected species habitats based on available open data (Artdatabanken/SGU).',
      recommendation: input.nearProtectedArea
        ? 'Commission a species inventory survey before any harvesting operations.'
        : undefined,
    },
    {
      id: 'eudr-5',
      requirement: 'Harvest volume within sustainable limits',
      description:
        'Annual harvest must not exceed the parcel\'s sustainable yield to maintain carbon stock (Art. 3 & Recital 14).',
      status:
        harvestWithinLimits === null
          ? 'unknown'
          : harvestWithinLimits
          ? 'pass'
          : 'fail',
      evidence:
        harvestWithinLimits === null
          ? 'No harvest volume data available.'
          : harvestWithinLimits
          ? `Recorded harvest ${input.annualHarvestM3} m³/year ≤ sustainable yield ${input.sustainableHarvestM3} m³/year.`
          : `Recorded harvest ${input.annualHarvestM3} m³/year exceeds estimated sustainable yield ${input.sustainableHarvestM3} m³/year.`,
      recommendation:
        harvestWithinLimits === false
          ? 'Reduce harvest intensity or update sustainable yield estimate with a certified forester.'
          : harvestWithinLimits === null
          ? 'Enter harvest history in the Harvest Log to enable this check.'
          : undefined,
    },
  ];
}

function fscChecks(input: ParcelComplianceInput): ComplianceCheck[] {
  return [
    {
      id: 'fsc-1',
      requirement: 'Forest Management Plan in place (FSC Principle 7)',
      description: 'A documented, approved management plan covering at least 10 years must exist.',
      status: 'unknown',
      evidence: 'No management plan document linked to this parcel.',
      recommendation: 'Generate a Forest Management Plan using the Forest Plan tool, then upload to Document Vault.',
    },
    {
      id: 'fsc-2',
      requirement: 'High Conservation Values (HCV) assessed (FSC Principle 9)',
      description: 'An HCV assessment must identify and protect areas of exceptional biodiversity or community importance.',
      status: input.nearProtectedArea ? 'warning' : 'unknown',
      evidence: input.nearProtectedArea
        ? 'Parcel is near a protected area — HCV assessment is especially important here.'
        : 'HCV assessment not documented. Recommended before FSC certification application.',
      recommendation: 'Engage an FSC-accredited auditor to conduct an HCV assessment.',
    },
    {
      id: 'fsc-3',
      requirement: 'No use of prohibited chemicals (FSC Principle 10)',
      description: 'FSC prohibits pesticides listed in WHO Class Ia, Ib, and specific other chemicals.',
      status: 'unknown',
      evidence: 'Chemical use records not available in BeetleSense.',
      recommendation: 'Log all pesticide and herbicide use in the Field Log. Verify against FSC prohibited list.',
    },
    {
      id: 'fsc-4',
      requirement: 'Workers\' rights and safety (FSC Principle 4)',
      description: 'All forest workers must have safe conditions, fair wages, and freedom of association.',
      status: 'unknown',
      evidence: 'No contractor records on file.',
      recommendation: 'Ensure all contracted workers have documented agreements meeting local labour law standards.',
    },
    {
      id: 'fsc-5',
      requirement: 'Buffer zones along watercourses (FSC Sweden standard 8.4)',
      description: 'A minimum 5m buffer zone around streams and water bodies must be maintained.',
      status: 'unknown',
      evidence: 'Buffer zone compliance not assessed. Requires on-site verification.',
      recommendation: 'Document buffer zones in parcel plan or confirm with site visit.',
    },
  ];
}

function pefcChecks(input: ParcelComplianceInput): ComplianceCheck[] {
  return [
    {
      id: 'pefc-1',
      requirement: 'Chain of Custody documentation (PEFC ST 2002)',
      description: 'Timber must be traceable from the forest through the supply chain to the end product.',
      status: 'unknown',
      evidence: 'Chain of custody records not linked to this parcel.',
      recommendation: 'Use the Chain of Custody tool to log timber movements and buyers.',
    },
    {
      id: 'pefc-2',
      requirement: 'Sustainable forest management standard compliance (PEFC ST 1003)',
      description: 'Forest must be managed under a nationally recognised sustainable management standard.',
      status: 'unknown',
      evidence: 'FSC or national SFM certification not confirmed.',
      recommendation: 'Apply for PEFC-endorsed Swedish PEFC certification (via Skogscertifiering).',
    },
    {
      id: 'pefc-3',
      requirement: 'Biodiversity considerations in harvest planning',
      description: 'Retention trees (naturvårdsträd) and deadwood must be maintained.',
      status: 'unknown',
      evidence: 'Retention tree data not recorded.',
      recommendation: 'Record retention trees (aim ≥ 5/ha) in the Tree Inventory module.',
    },
    {
      id: 'pefc-4',
      requirement: 'Regeneration plan after harvest',
      description: 'A regeneration plan ensuring adequate stocking within 3 years of final felling is required.',
      status: input.lastHarvestYear != null ? 'warning' : 'unknown',
      evidence:
        input.lastHarvestYear != null
          ? `Last harvest recorded in ${input.lastHarvestYear}. Regeneration compliance should be verified.`
          : 'No harvest history on record.',
      recommendation: 'Document planting/natural regeneration outcomes in the Harvest Log.',
    },
  ];
}

function swedishForestryActChecks(input: ParcelComplianceInput): ComplianceCheck[] {
  return [
    {
      id: 'sfa-1',
      requirement: 'Avverkningsanmälan filed before final felling (§ 14 Skogsvårdslagen)',
      description: 'Final felling of more than 0.5 ha requires notification to Skogsstyrelsen at least 6 weeks in advance.',
      status: 'unknown',
      evidence: 'No felling notification on record for this parcel.',
      recommendation: 'Use the Avverkningsanmälan tool to file notification before any planned final felling.',
    },
    {
      id: 'sfa-2',
      requirement: 'Scarification and replanting obligations met (§ 5–6)',
      description: 'After final felling, the owner must ensure new forest is established within 3 years.',
      status: input.lastHarvestYear != null && (new Date().getFullYear() - input.lastHarvestYear) <= 3 ? 'warning' : 'unknown',
      evidence:
        input.lastHarvestYear != null
          ? `Harvest recorded ${input.lastHarvestYear}. Verify that replanting/natural regeneration is underway.`
          : 'No harvest history recorded.',
      recommendation: 'Log scarification and planting in the Harvest Log.',
    },
    {
      id: 'sfa-3',
      requirement: 'Retention trees left at final felling (§ 30 SKSFS 2011:7)',
      description: 'At least 10 retention trees per hectare must be left to support biodiversity.',
      status: 'unknown',
      evidence: 'Retention tree data not available.',
      recommendation: 'Record retention trees in the Tree Inventory module and attach to harvest report.',
    },
    {
      id: 'sfa-4',
      requirement: 'Cultural heritage protection (§ 31)',
      description: 'All known cultural heritage sites (e.g., ancient monuments) must be protected during forest operations.',
      status: 'unknown',
      evidence: 'Cultural heritage overlay not checked. Consult Riksantikvarieämbetet FMIS database.',
      recommendation: 'Check the FMIS heritage site map before any ground-disturbing work.',
    },
    {
      id: 'sfa-5',
      requirement: 'Site preparation method approved (§ 30)',
      description: 'Soil scarification must use approved methods. Whole-tree harvesting has specific restrictions.',
      status: 'unknown',
      evidence: 'Soil preparation method not recorded.',
      recommendation: 'Specify the scarification method in the Forest Plan or Harvest Log.',
    },
  ];
}

// ─── Main report generator ────────────────────────────────────────────────────

export async function generateComplianceReport(
  input: ParcelComplianceInput,
  framework: ComplianceFramework,
): Promise<ComplianceReport> {
  await new Promise((resolve) => setTimeout(resolve, 600)); // simulate async fetch

  let checks: ComplianceCheck[];
  switch (framework) {
    case 'EUDR':
      checks = eudrChecks(input);
      break;
    case 'FSC':
      checks = fscChecks(input);
      break;
    case 'PEFC':
      checks = pefcChecks(input);
      break;
    case 'Swedish_Forestry_Act':
      checks = swedishForestryActChecks(input);
      break;
  }

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const unknownCount = checks.filter((c) => c.status === 'unknown').length;

  const overallStatus =
    failCount > 0 ? 'FAIL' : warningCount > 0 || unknownCount > 0 ? 'NEEDS_ATTENTION' : 'PASS';

  const summary =
    overallStatus === 'PASS'
      ? `Your forest passes all ${framework} requirements assessed.`
      : overallStatus === 'FAIL'
      ? `${failCount} item${failCount > 1 ? 's' : ''} need${failCount === 1 ? 's' : ''} immediate attention to meet ${framework} requirements.`
      : `${warningCount + unknownCount} item${warningCount + unknownCount > 1 ? 's' : ''} need${warningCount + unknownCount === 1 ? 's' : ''} attention or further documentation.`;

  return {
    framework,
    parcelId: input.parcelId,
    parcelName: input.parcelName,
    farmName: input.farmName,
    generatedAt: new Date().toISOString(),
    checks,
    overallStatus,
    passCount,
    failCount,
    warningCount,
    unknownCount,
    summary,
  };
}

export function generatePrintableHtml(report: ComplianceReport): string {
  const statusIcon = (s: CheckStatus) => {
    if (s === 'pass') return '✅';
    if (s === 'fail') return '❌';
    if (s === 'warning') return '⚠️';
    return '❓';
  };

  const statusColor = (s: CheckStatus) => {
    if (s === 'pass') return '#1B5E20';
    if (s === 'fail') return '#C62828';
    if (s === 'warning') return '#E65100';
    return '#546E7A';
  };

  const checkRows = report.checks
    .map(
      (c) => `
    <tr>
      <td style="padding:10px 8px; border-bottom:1px solid #e0e0e0; font-size:13px; color:#1B5E20; font-size:16px;">${statusIcon(c.status)}</td>
      <td style="padding:10px 8px; border-bottom:1px solid #e0e0e0;">
        <strong style="font-size:13px; color:#1a1a1a;">${c.requirement}</strong>
        <br><span style="font-size:11px; color:#666;">${c.description}</span>
        <br><span style="font-size:11px; color:${statusColor(c.status)}; margin-top:4px; display:block;">${c.evidence}</span>
        ${c.recommendation ? `<span style="font-size:11px; color:#E65100; font-style:italic;">Action: ${c.recommendation}</span>` : ''}
      </td>
      <td style="padding:10px 8px; border-bottom:1px solid #e0e0e0; text-align:center; font-size:11px; font-weight:600; color:${statusColor(c.status)}; white-space:nowrap;">${c.status.toUpperCase()}</td>
    </tr>`,
    )
    .join('');

  const overallColor = report.overallStatus === 'PASS' ? '#1B5E20' : report.overallStatus === 'FAIL' ? '#C62828' : '#E65100';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${report.framework} Compliance Report — ${report.farmName}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'DM Sans', Arial, sans-serif; color: #1a1a1a; background: #fff; }
    h1 { font-size: 20px; color: #1B5E20; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #333; margin-bottom: 16px; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #F5F7F4; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 2px solid #1B5E20; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 700; color: #fff; background: ${overallColor}; }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <h1>${report.framework} Compliance Self-Assessment — ${report.farmName}</h1>
  <h2>${report.parcelName} &nbsp;|&nbsp; Generated: ${new Date(report.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>

  <div>
    Overall status: <span class="badge">${report.overallStatus.replace('_', ' ')}</span>
    &nbsp;&nbsp;
    <span style="font-size:13px; color:#555;">${report.summary}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:32px;"></th>
        <th>Requirement</th>
        <th style="width:80px; text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${checkRows}
    </tbody>
  </table>

  <footer>
    Generated by BeetleSense &mdash; This is a self-assessment tool only. Consult a certified forester for official compliance verification.
    &nbsp;|&nbsp; beetlesense.ai &nbsp;|&nbsp; Report ID: CR-${Date.now().toString(36).toUpperCase()}
  </footer>
</body>
</html>`;
}
