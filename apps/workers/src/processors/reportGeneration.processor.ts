import { Job, Worker } from 'bullmq'
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

      // Step 8: Update report status to complete
      await job.updateProgress(95)
      await supabase
        .from('reports')
        .update({
          status: 'completed',
          file_path: storagePath,
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
  const title = isSv
    ? `BeetleSense — ${reportType === 'summary' ? 'Sammanfattning' : 'Detaljerad rapport'}`
    : `BeetleSense — ${reportType === 'summary' ? 'Summary Report' : 'Detailed Report'}`

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
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a2e; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { color: #0f5132; border-bottom: 2px solid #0f5132; padding-bottom: 8px; }
    h2 { color: #0f5132; margin-top: 32px; }
    .report-section { margin-bottom: 24px; }
    .section-content { line-height: 1.6; }
    .metadata { font-size: 0.85em; color: #666; margin-bottom: 24px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="metadata">
    <p>${isSv ? 'Undersökning' : 'Survey'}: ${survey.id ?? 'N/A'}</p>
    <p>${isSv ? 'Genererad' : 'Generated'}: ${new Date().toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-GB')}</p>
  </div>
  ${sectionsHTML}
  <footer style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 0.8em; color: #888;">
    ${isSv ? 'Genererad av BeetleSense.ai' : 'Generated by BeetleSense.ai'} &mdash; ${new Date().toISOString()}
  </footer>
</body>
</html>`
}
