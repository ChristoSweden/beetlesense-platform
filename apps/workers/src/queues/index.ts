import { Queue } from 'bullmq'
import {
  createSurveyProcessingQueue,
  SURVEY_PROCESSING_QUEUE,
} from './surveyProcessing.queue.js'
import {
  createOpenDataSyncQueue,
  scheduleNightlySync,
  OPEN_DATA_SYNC_QUEUE,
} from './openDataSync.queue.js'
import {
  createUploadValidationQueue,
  UPLOAD_VALIDATION_QUEUE,
} from './uploadValidation.queue.js'
import {
  createReportGenerationQueue,
  REPORT_GENERATION_QUEUE,
} from './reportGeneration.queue.js'
import {
  createSatelliteFetchQueue,
  SATELLITE_FETCH_QUEUE,
} from './satelliteFetch.queue.js'
import {
  createLidarProcessingQueue,
  LIDAR_PROCESSING_QUEUE,
} from './lidarProcessing.queue.js'
import {
  createKbIngestionQueue,
  KB_INGESTION_QUEUE,
} from './kbIngestion.queue.js'
import {
  createKnowledgebaseIngestionQueue,
  KNOWLEDGEBASE_INGESTION_QUEUE,
} from './knowledgebaseIngestion.queue.js'
import {
  createProjectContextQueue,
  PROJECT_CONTEXT_QUEUE,
} from './projectContext.queue.js'
import {
  createWebSearchQueue,
  scheduleWebSearchSync,
  WEB_SEARCH_QUEUE,
} from './webSearch.queue.js'
import {
  createBlogGenerationQueue,
  scheduleDailyBlogGeneration,
  BLOG_GENERATION_QUEUE,
} from './blogGeneration.queue.js'
import { logger } from '../lib/logger.js'

export {
  SURVEY_PROCESSING_QUEUE,
  OPEN_DATA_SYNC_QUEUE,
  UPLOAD_VALIDATION_QUEUE,
  REPORT_GENERATION_QUEUE,
  SATELLITE_FETCH_QUEUE,
  LIDAR_PROCESSING_QUEUE,
  KB_INGESTION_QUEUE,
  KNOWLEDGEBASE_INGESTION_QUEUE,
  PROJECT_CONTEXT_QUEUE,
  WEB_SEARCH_QUEUE,
  BLOG_GENERATION_QUEUE,
}

export type { SurveyProcessingJobData } from './surveyProcessing.queue.js'
export type { OpenDataSyncJobData } from './openDataSync.queue.js'
export type { UploadValidationJobData } from './uploadValidation.queue.js'
export type { ReportGenerationJobData } from './reportGeneration.queue.js'
export type { SatelliteFetchJobData } from './satelliteFetch.queue.js'
export type { LidarProcessingJobData } from './lidarProcessing.queue.js'
export type { KbIngestionJobData } from './kbIngestion.queue.js'
export type { KnowledgebaseIngestionJobData } from './knowledgebaseIngestion.queue.js'
export type { ProjectContextJobData } from './projectContext.queue.js'
export type { WebSearchJobData } from './webSearch.queue.js'
export type { BlogGenerationJobData } from './blogGeneration.queue.js'

export { addSurveyProcessingJob } from './surveyProcessing.queue.js'
export { addKbIngestionJob } from './kbIngestion.queue.js'
export {
  addPaperIngestionJob,
  addBatchIngestionJob,
  addRegulatoryIngestionJob,
  addIndexRebuildJob,
} from './knowledgebaseIngestion.queue.js'
export {
  addAnalysisContextJob,
  addSatelliteContextJob,
} from './projectContext.queue.js'
export { addWebSearchJob } from './webSearch.queue.js'
export { addBlogGenerationJob } from './blogGeneration.queue.js'

export interface QueueRegistry {
  surveyProcessing: Queue
  openDataSync: Queue
  uploadValidation: Queue
  reportGeneration: Queue
  satelliteFetch: Queue
  lidarProcessing: Queue
  kbIngestion: Queue
  knowledgebaseIngestion: Queue
  projectContext: Queue
  webSearch: Queue
  blogGeneration: Queue
}

/**
 * Initialize all queues and schedule repeatable jobs.
 */
export async function initializeQueues(): Promise<QueueRegistry> {
  const queues: QueueRegistry = {
    surveyProcessing: createSurveyProcessingQueue(),
    openDataSync: createOpenDataSyncQueue(),
    uploadValidation: createUploadValidationQueue(),
    reportGeneration: createReportGenerationQueue(),
    satelliteFetch: createSatelliteFetchQueue(),
    lidarProcessing: createLidarProcessingQueue(),
    kbIngestion: createKbIngestionQueue(),
    knowledgebaseIngestion: createKnowledgebaseIngestionQueue(),
    projectContext: createProjectContextQueue(),
    webSearch: createWebSearchQueue(),
    blogGeneration: createBlogGenerationQueue(),
  }

  // Schedule repeatable jobs
  await scheduleNightlySync(queues.openDataSync)
  logger.info('Nightly open data sync scheduled (cron: 0 2 * * *)')

  await scheduleWebSearchSync(queues.webSearch)
  logger.info('Web search sync scheduled (cron: 0 */6 * * *)')

  await scheduleDailyBlogGeneration(queues.blogGeneration)
  logger.info('Daily blog generation scheduled (cron: 0 5 * * *)')

  logger.info(
    {
      queues: [
        SURVEY_PROCESSING_QUEUE,
        OPEN_DATA_SYNC_QUEUE,
        UPLOAD_VALIDATION_QUEUE,
        REPORT_GENERATION_QUEUE,
        SATELLITE_FETCH_QUEUE,
        LIDAR_PROCESSING_QUEUE,
        KB_INGESTION_QUEUE,
        KNOWLEDGEBASE_INGESTION_QUEUE,
        PROJECT_CONTEXT_QUEUE,
        WEB_SEARCH_QUEUE,
        BLOG_GENERATION_QUEUE,
      ],
    },
    'All queues initialized',
  )

  return queues
}

/**
 * Close all queues gracefully.
 */
export async function closeQueues(queues: QueueRegistry): Promise<void> {
  await Promise.all([
    queues.surveyProcessing.close(),
    queues.openDataSync.close(),
    queues.uploadValidation.close(),
    queues.reportGeneration.close(),
    queues.satelliteFetch.close(),
    queues.lidarProcessing.close(),
    queues.kbIngestion.close(),
    queues.knowledgebaseIngestion.close(),
    queues.projectContext.close(),
    queues.webSearch.close(),
    queues.blogGeneration.close(),
  ])
  logger.info('All queues closed')
}
