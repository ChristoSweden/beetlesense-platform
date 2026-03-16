import type { Job} from 'bullmq';
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  REPORT_GENERATION_QUEUE,
  type ReportGenerationJobData,
} from '../queues/reportGeneration.queue.js'

/**
 * Report Generation Worker
 *
 * Pipeline:
 * 1. Fetch survey + parcel data from Supabase
 * 2. Gather module results (beetle detection, NDVI, volume, etc.)
 * 3. Fetch companion findings if requested
 * 4. Compile report sections
 * 5. Generate PDF via headless rendering
 * 6. Upload PDF to S3 storage
 * 7. Update report record with download URL
 * 8. Notify the requesting user
 */
export function createReportGenerationWorker(): Worker<ReportGenerationJobData> {
  const worker = new Worker<ReportGenerationJobData>(
    REPORT_GENERATION_QUEUE,
    async (job: Job<ReportGenerationJobData>) => {
      const log = createJobLogger(job.id!, REPORT_GENERATION_QUEUE)
      const supabase = getSupabaseAdmin()
      const { surveyId, organizationId, parcelId, reportType, modules, locale, requestedBy } =
        job.data

      log.info({ surveyId, reportType, modules, locale }, 'Starting report generation')

      // Step 1: Fetch survey data
      await job.updateProgress(10)
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*, parcels(*)')
        .eq('id', surveyId)
        .single()

      if (surveyError || !survey) {
        throw new Error(`Survey not found: ${surveyId} — ${surveyError?.message}`)
      }

      // Step 2: Fetch module results
      await job.updateProgress(20)
      const { data: analysisResults } = await supabase
        .from('analysis_results')
        .select('*')
        .eq('survey_id', surveyId)
        .in('module', modules)

      if (!analysisResults?.length) {
        throw new Error(`No analysis results found for survey ${surveyId}`)
      }

      // Step 3: Compile report sections based on type
      await job.updateProgress(40)
      const reportSections = compileReportSections(
        survey,
        analysisResults,
        reportType,
        locale,
      )

      // Step 4: Fetch companion insights if available
      await job.updateProgress(50)
      const { data: companionLogs } = await supabase
        .from('companion_interactions')
        .select('query, response, confidence')
        .eq('survey_id', surveyId)
        .eq('user_id', requestedBy)
        .order('created_at', { ascending: false })
        .limit(10)

      if (companionLogs?.length) {
        reportSections.push({
          title: locale === 'sv' ? 'AI-assistentens insikter' : 'AI Companion Insights',
          content: companionLogs
            .map(
              (log) =>
                `**Q:** ${log.query}\n**A:** ${log.response} _(confidence: ${Math.round((log.confidence ?? 0) * 100)}%)_`,
            )
            .join('\n\n---\n\n'),
          order: 90,
        })
      }

      // Step 5: Create report record in database
      await job.updateProgress(60)
      const reportSlug = `${reportType}-${surveyId.slice(0, 8)}-${Date.now()}`
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          survey_id: surveyId,
          organization_id: organizationId,
          parcel_id: parcelId,
          report_type: reportType,
          locale,
          status: 'generating',
          generated_by: requestedBy,
          slug: reportSlug,
          sections: reportSections,
          metadata: {
            modules,
            companion_findings_count: companionLogs?.length ?? 0,
            analysis_results_count: analysisResults.length,
          },
        })
        .select()
        .single()

      if (reportError || !report) {
        throw new Error(`Failed to create report record: ${reportError?.message}`)
      }

      // Step 6: Generate report content (HTML → PDF would happen here)
      await job.updateProgress(75)
      const reportContent = generateReportHTML(reportSections, survey, locale, reportType)

      // Step 7: Upload to storage
      await job.updateProgress(85)
      const storagePath = `reports/${organizationId}/${report.id}/${reportSlug}.html`
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(storagePath, reportContent, {
          contentType: 'text/html',
          upsert: true,
        })

      if (uploadError) {
        log.warn({ uploadError }, 'Failed to upload report to storage, continuing')
      }

      // Step 8: Generate signed URL for report access and update status
      await job.updateProgress(95)
      const { data: signedUrlData } = await supabase.storage
        .from('reports')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year validity

      const pdfUrl = signedUrlData?.signedUrl ?? null

      await supabase
        .from('reports')
        .update({
          status: 'generated',
          file_path: storagePath,
          pdf_url: pdfUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', report.id)

      // Step 9: Create notification for the user
      await supabase.from('notifications').insert({
        user_id: requestedBy,
        type: 'report_ready',
        title: locale === 'sv' ? 'Rapport klar' : 'Report Ready',
        body:
          locale === 'sv'
            ? `Din ${reportType}-rapport är klar att ladda ner.`
            : `Your ${reportType} report is ready to download.`,
        metadata: { report_id: report.id, survey_id: surveyId },
      })

      await job.updateProgress(100)
      log.info({ reportId: report.id, storagePath }, 'Report generation complete')

      return { reportId: report.id, storagePath }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60_000,
      },
    },
  )

  worker.on('failed', (job, err) => {
    const log = createJobLogger(job?.id ?? 'unknown', REPORT_GENERATION_QUEUE)
    log.error({ err, jobData: job?.data }, 'Report generation failed')
  })

  return worker
}

// ─── Helpers ───

interface ReportSection {
  title: string
  content: string
  order: number
}

function compileReportSections(
  survey: Record<string, unknown>,
  analysisResults: Record<string, unknown>[],
  reportType: string,
  locale: string,
): ReportSection[] {
  const sections: ReportSection[] = []
  const isSv = locale === 'sv'

  // Executive summary
  sections.push({
    title: isSv ? 'Sammanfattning' : 'Executive Summary',
    content: isSv
      ? `Undersökning av skifte genomförd. ${analysisResults.length} analysmoduler bearbetade.`
      : `Survey analysis completed. ${analysisResults.length} analysis modules processed.`,
    order: 1,
  })

  // Module results
  for (const result of analysisResults) {
    const moduleName = (result.module as string) ?? 'unknown'
    const findings = result.findings as Record<string, unknown> | null

    sections.push({
      title: moduleName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      content: findings ? JSON.stringify(findings, null, 2) : 'No findings recorded.',
      order: 10 + sections.length,
    })
  }

  // Recommendations (detailed and valuation only)
  if (reportType !== 'summary') {
    sections.push({
      title: isSv ? 'Rekommendationer' : 'Recommendations',
      content: isSv
        ? 'Baserat på analysresultaten rekommenderas följande åtgärder.'
        : 'Based on the analysis results, the following actions are recommended.',
      order: 80,
    })
  }

  // Valuation section (valuation type only)
  if (reportType === 'full' || reportType === 'module') {
    sections.push({
      title: isSv ? 'Värderingsbilaga' : 'Valuation Appendix',
      content: isSv
        ? 'Detaljerad data för professionell skogsvärdering.'
        : 'Detailed data formatted for professional forest valuation.',
      order: 85,
    })
  }

  return sections.sort((a, b) => a.order - b.order)
}

function generateReportHTML(
  sections: ReportSection[],
  survey: Record<string, unknown>,
  locale: string,
  reportType: string,
): string {
  const isSv = locale === 'sv'
  const parcel = survey.parcels as Record<string, unknown> | undefined
  const parcelName = (parcel?.name as string) ?? (survey.parcel_name as string) ?? 'N/A'
  const reportTypeLabels: Record<string, { en: string; sv: string }> = {
    summary: { en: 'Summary Report', sv: 'Sammanfattning' },
    full: { en: 'Detailed Report', sv: 'Detaljerad rapport' },
    module: { en: 'Module Report', sv: 'Modulrapport' },
    inspector_valuation: { en: 'Valuation Report', sv: 'Värderingsrapport' },
    insurance_claim: { en: 'Insurance Report', sv: 'Försäkringsrapport' },
  }
  const typeLabel = reportTypeLabels[reportType]
    ? (isSv ? reportTypeLabels[reportType].sv : reportTypeLabels[reportType].en)
    : reportType
  const title = `BeetleSense — ${typeLabel}`
  const dateStr = new Date().toLocaleDateString(isSv ? 'sv-SE' : 'en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const sectionsHTML = sections
    .map(
      (s) => `
      <section class="report-section">
        <h2>${s.title}</h2>
        <div class="section-content">${s.content.replace(/\n/g, '<br/>')}</div>
      </section>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
    :root {
      --green: #4ade80;
      --green-dark: #0f5132;
      --bg: #ffffff;
      --text: #1a1a2e;
      --text2: #4a4a5a;
      --text3: #8a8a9a;
      --border: #e5e7eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      color: var(--text);
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 40px;
      line-height: 1.7;
      background: var(--bg);
    }
    /* Cover header */
    .report-header {
      border-bottom: 3px solid var(--green-dark);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .report-header .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .report-header .logo svg { width: 28px; height: 28px; }
    .report-header .logo span {
      font-family: 'DM Serif Display', serif;
      font-size: 20px;
      color: var(--green-dark);
      font-weight: 400;
    }
    .report-header h1 {
      font-family: 'DM Serif Display', serif;
      font-size: 28px;
      color: var(--green-dark);
      margin-bottom: 8px;
      font-weight: 400;
    }
    .report-header .subtitle {
      font-size: 16px;
      color: var(--text2);
    }
    /* Metadata grid */
    .metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
      padding: 16px;
      background: #f8faf8;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .metadata .meta-item { font-size: 13px; }
    .metadata .meta-label { color: var(--text3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .metadata .meta-value { color: var(--text); font-weight: 500; }
    /* Sections */
    .report-section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .report-section h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 20px;
      color: var(--green-dark);
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
      font-weight: 400;
    }
    .section-content {
      font-size: 14px;
      color: var(--text2);
      line-height: 1.7;
    }
    .section-content pre {
      background: #f4f4f5;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      margin: 8px 0;
    }
    /* Footer */
    .report-footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 2px solid var(--border);
      font-size: 11px;
      color: var(--text3);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    /* Print styles */
    @media print {
      body { padding: 20px; font-size: 12px; }
      .report-header { page-break-after: avoid; }
      .report-section { page-break-inside: avoid; }
      .report-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 20px; }
    }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#0f5132" stroke-width="2"/>
        <path d="M12 6v6l4 2" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>BeetleSense.ai</span>
    </div>
    <h1>${typeLabel}</h1>
    <p class="subtitle">${parcelName}</p>
  </div>

  <div class="metadata">
    <div class="meta-item">
      <div class="meta-label">${isSv ? 'Skifte' : 'Parcel'}</div>
      <div class="meta-value">${parcelName}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">${isSv ? 'Undersökning' : 'Survey ID'}</div>
      <div class="meta-value">${(survey.id as string)?.slice(0, 8) ?? 'N/A'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">${isSv ? 'Rapporttyp' : 'Report Type'}</div>
      <div class="meta-value">${typeLabel}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">${isSv ? 'Genererad' : 'Generated'}</div>
      <div class="meta-value">${dateStr}</div>
    </div>
  </div>

  ${sectionsHTML}

  <div class="report-footer">
    <span>${isSv ? 'Genererad av BeetleSense.ai — Skogsintelligenplattform' : 'Generated by BeetleSense.ai — Forest Intelligence Platform'}</span>
    <span>${dateStr}</span>
  </div>
</body>
</html>`
}
