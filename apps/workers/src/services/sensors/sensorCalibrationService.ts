import { execFile } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { downloadToFile, uploadFromFile, uploadToS3 } from '../../lib/storage.js'

import {
  MicaSenseCalibration,
  type MicaSenseModel,
  type ReflectanceFactors,
  type CalibrationResult,
} from './micasenseCalibration.js'
import {
  FlirCalibration,
  type AtmosphericParams,
  type ThermalCameraModel,
  type TemperatureCalibrationResult,
} from './flirCalibration.js'

const execFileAsync = promisify(execFile)

// ─── Sensor type detection ──────────────────────────────────────────────────

export type SensorCategory = 'micasense' | 'flir-thermal' | 'rgb' | 'unknown'

export interface DetectedSensor {
  category: SensorCategory
  model: string
  make: string
  /** For MicaSense sensors */
  micasenseModel?: MicaSenseModel
  /** For thermal sensors */
  thermalModel?: ThermalCameraModel
}

// ─── Calibration report ─────────────────────────────────────────────────────

export interface CalibrationQAMetrics {
  /** Panel detection confidence (0-1, null if no panel used) */
  panelDetectionConfidence: number | null
  /** Number of panel images found */
  panelImagesFound: number
  /** Per-band R-squared values for reflectance factor fit */
  perBandRSquared: number[]
  /** Were both pre-flight and post-flight panels detected */
  hasDualPanelCapture: boolean
  /** Percentage of images successfully calibrated */
  calibrationSuccessRate: number
  /** Any warnings generated during calibration */
  warnings: string[]
}

export interface CalibrationReport {
  /** Survey ID */
  surveyId: string
  /** Detected sensor model */
  sensorModel: string
  /** Sensor category */
  sensorCategory: SensorCategory
  /** Calibration method used */
  method: string
  /** Per-band correction factors (for multispectral) */
  perBandFactors: Array<{ band: string; factor: number; wavelength: number }>
  /** QA metrics */
  qa: CalibrationQAMetrics
  /** Atmospheric parameters used (for thermal) */
  atmosphericParams?: AtmosphericParams
  /** Temperature statistics (for thermal) */
  temperatureStats?: { min: number; max: number; mean: number; stdDev: number }
  /** Number of images processed */
  imagesProcessed: number
  /** Total processing time in seconds */
  processingTimeSec: number
  /** Timestamp */
  timestamp: string
}

export interface CalibrationOutput {
  /** S3 paths to calibrated images */
  calibratedPaths: string[]
  /** Calibration report */
  report: CalibrationReport
  /** S3 path to the stored calibration report (JSON) */
  reportPath: string
}

// ─── Default calibration panel reflectance values ───────────────────────────

/**
 * MicaSense CRP (Calibrated Reflectance Panel) known reflectance values.
 * These are the factory-calibrated values for the standard MicaSense panel.
 * Order: Blue, Green, Red, RedEdge, NIR
 */
const MICASENSE_CRP_REFLECTANCES = [0.67, 0.69, 0.68, 0.67, 0.61]

/**
 * Default atmospheric parameters for Swedish forestry drone surveys.
 * Typical summer conditions in southern/central Sweden.
 */
const DEFAULT_SWEDISH_ATMOSPHERIC_PARAMS: AtmosphericParams = {
  distance: 60, // typical flight altitude ~60m AGL
  humidity: 0.6, // ~60% RH typical Swedish summer
  airTemperature: 18, // ~18°C typical Swedish summer
  emissivity: 0.95, // vegetation canopy
  reflectedTemperature: 18,
}

/**
 * Unified sensor calibration orchestrator.
 *
 * Detects the sensor type from EXIF metadata and routes to the appropriate
 * calibration pipeline (MicaSense multispectral or FLIR/DJI thermal).
 * Manages the full calibration lifecycle from panel detection through
 * calibrated product storage and report generation.
 */
export class SensorCalibrationService {
  private readonly log = logger.child({ service: 'sensor-calibration' })
  private readonly micasense = new MicaSenseCalibration()
  private readonly flir = new FlirCalibration()

  /**
   * Detect the sensor model from EXIF metadata of an image.
   *
   * @param imagePath - S3 path to a sample image from the survey
   * @returns Detected sensor information
   */
  async detectSensor(imagePath: string): Promise<DetectedSensor> {
    this.log.debug({ image: imagePath }, 'Detecting sensor model from EXIF')

    const tempDir = join(tmpdir(), `beetlesense-sensor-detect-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = imagePath.split('/').pop() ?? 'sample.tif'
      const localPath = join(tempDir, filename)
      await downloadToFile(imagePath, localPath)

      const { stdout } = await execFileAsync('exiftool', ['-json', '-n', localPath], {
        timeout: 15_000,
      })
      const tags = JSON.parse(stdout)[0] ?? {}

      const model = String(tags['Model'] ?? tags['CameraModel'] ?? '').toLowerCase()
      const make = String(tags['Make'] ?? '').toLowerCase()

      // MicaSense detection
      if (make.includes('micasense') || model.includes('rededge') || model.includes('altum')) {
        let micasenseModel: MicaSenseModel = 'RedEdge-MX'
        if (model.includes('altum')) micasenseModel = 'Altum'
        else if (model.includes('dual') || model.includes('rededge-p')) micasenseModel = 'Dual'

        return {
          category: 'micasense',
          model: tags['Model'] ?? 'MicaSense',
          make: tags['Make'] ?? 'MicaSense',
          micasenseModel,
        }
      }

      // FLIR / DJI thermal detection
      if (
        make.includes('flir') || make.includes('teledyne') ||
        model.includes('h20t') || model.includes('m30t') ||
        model.includes('vue') || model.includes('duo') ||
        model.includes('thermal') || model.includes('ir camera')
      ) {
        let thermalModel: ThermalCameraModel = 'unknown'
        if (model.includes('h20t') || model.includes('zenmuse h20t')) thermalModel = 'DJI-H20T'
        else if (model.includes('m30t') || model.includes('matrice 30t')) thermalModel = 'DJI-M30T'
        else if (model.includes('vue pro')) thermalModel = 'FLIR-Vue-Pro'
        else if (model.includes('duo pro')) thermalModel = 'FLIR-Duo-Pro'
        else if (make.includes('dji')) thermalModel = 'DJI-H20T'
        else if (make.includes('flir') || make.includes('teledyne')) thermalModel = 'FLIR-Vue-Pro'

        return {
          category: 'flir-thermal',
          model: tags['Model'] ?? 'Unknown Thermal',
          make: tags['Make'] ?? 'Unknown',
          thermalModel,
        }
      }

      // DJI multispectral (P4 Multispectral)
      if (make.includes('dji') && model.includes('multispectral')) {
        return {
          category: 'micasense', // Use MicaSense pipeline — same band layout
          model: tags['Model'] ?? 'DJI Multispectral',
          make: tags['Make'] ?? 'DJI',
          micasenseModel: 'RedEdge-MX', // Similar 5-band layout
        }
      }

      // Default: RGB camera
      this.log.info({ model, make }, 'Detected as RGB sensor (no calibration needed)')
      return {
        category: 'rgb',
        model: tags['Model'] ?? 'Unknown',
        make: tags['Make'] ?? 'Unknown',
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Full calibration pipeline for a survey's sensor data.
   *
   * Steps:
   *   a. Detect sensor model from EXIF metadata
   *   b. Route to appropriate calibration service
   *   c. Apply calibration to all images
   *   d. Store calibrated products in S3
   *   e. Update sensor_products with calibration metadata
   *
   * @param surveyId - Survey ID
   * @param sensorType - Optional sensor type override ('multispectral' | 'thermal')
   * @param imagePaths - S3 paths to all survey images
   * @param outputDir - S3 output directory prefix
   * @param knownReflectances - Optional custom panel reflectance values
   * @param atmosphericParams - Optional atmospheric parameters for thermal
   */
  async calibrateSurveyData(
    surveyId: string,
    sensorType: 'multispectral' | 'thermal' | 'auto',
    imagePaths: string[],
    outputDir: string,
    knownReflectances?: number[],
    atmosphericParams?: AtmosphericParams,
  ): Promise<CalibrationOutput> {
    const startTime = Date.now()
    this.log.info(
      { surveyId, sensorType, imageCount: imagePaths.length, outputDir },
      'Starting survey calibration',
    )

    if (imagePaths.length === 0) {
      throw new Error('No images provided for calibration')
    }

    // Step a: Detect sensor model from a sample image
    const detectedSensor = await this.detectSensor(imagePaths[0])
    this.log.info(
      { category: detectedSensor.category, model: detectedSensor.model },
      'Sensor detected',
    )

    // Resolve effective sensor type
    const effectiveType = sensorType === 'auto'
      ? (detectedSensor.category === 'flir-thermal' ? 'thermal' : 'multispectral')
      : sensorType

    // Step b & c: Route to appropriate calibration pipeline
    let output: CalibrationOutput
    if (effectiveType === 'multispectral' && detectedSensor.category === 'micasense') {
      output = await this.calibrateMicaSenseSurvey(
        surveyId,
        detectedSensor,
        imagePaths,
        outputDir,
        knownReflectances,
        startTime,
      )
    } else if (effectiveType === 'thermal') {
      output = await this.calibrateThermalSurvey(
        surveyId,
        detectedSensor,
        imagePaths,
        outputDir,
        atmosphericParams,
        startTime,
      )
    } else {
      // RGB or unknown — generate a minimal report (no calibration needed)
      output = await this.generateNoCalibrationReport(
        surveyId,
        detectedSensor,
        imagePaths,
        outputDir,
        startTime,
      )
    }

    // Step e: Update sensor_products table with calibration metadata
    await this.updateSensorProducts(surveyId, effectiveType, output)

    this.log.info(
      {
        surveyId,
        calibratedImages: output.calibratedPaths.length,
        processingTimeSec: output.report.processingTimeSec,
      },
      'Survey calibration complete',
    )

    return output
  }

  // ─── MicaSense calibration pipeline ─────────────────────────────────────

  private async calibrateMicaSenseSurvey(
    surveyId: string,
    sensor: DetectedSensor,
    imagePaths: string[],
    outputDir: string,
    knownReflectances?: number[],
    startTime?: number,
  ): Promise<CalibrationOutput> {
    const warnings: string[] = []
    const start = startTime ?? Date.now()

    // Step 1: Detect calibration panels
    const panelResults = await this.micasense.detectCalibrationPanel(imagePaths)

    const hasPreflight = panelResults.some((p) => p.position === 'pre-flight')
    const hasPostflight = panelResults.some((p) => p.position === 'post-flight')
    const allPanelImages = panelResults.flatMap((p) => p.panelImages)
    const allConfidences = panelResults.flatMap((p) => p.confidence)

    if (allPanelImages.length === 0) {
      warnings.push('No calibration panel detected — using sensor-only radiometric calibration')
    }
    if (!hasPreflight) {
      warnings.push('No pre-flight panel capture detected')
    }
    if (!hasPostflight) {
      warnings.push('No post-flight panel capture detected — calibration accuracy may be reduced')
    }

    // Step 2: Compute reflectance factors from panel images
    const reflectances = knownReflectances ?? MICASENSE_CRP_REFLECTANCES
    let calibrationFactors: ReflectanceFactors

    if (allPanelImages.length > 0) {
      calibrationFactors = await this.micasense.computeReflectanceFactors(
        allPanelImages,
        reflectances,
      )
    } else {
      // Fallback: use unity factors (sensor-only calibration without panel)
      const bands = this.micasense.getBands(sensor.micasenseModel ?? 'RedEdge-MX')
      calibrationFactors = {
        factors: bands.map(() => 1.0),
        bandNames: bands.map((b) => b.name),
        knownReflectances: reflectances,
        rSquared: bands.map(() => 0),
      }
      warnings.push('Using unity reflectance factors (no panel calibration)')
    }

    // Step 3: Apply calibration to all flight images (exclude panel images)
    const flightImages = imagePaths.filter((p) => !allPanelImages.includes(p))
    const calibratedPaths: string[] = []
    let successCount = 0
    let failCount = 0

    for (const imgPath of flightImages) {
      try {
        const result = await this.micasense.applyRadiometricCalibration(imgPath, calibrationFactors)
        calibratedPaths.push(result.calibratedPath)
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.log.warn({ image: imgPath, error: msg }, 'Failed to calibrate image, skipping')
        failCount++
      }
    }

    if (failCount > 0) {
      warnings.push(`${failCount} of ${flightImages.length} images failed calibration`)
    }

    // Step 4: Generate calibration report
    const bands = this.micasense.getBands(sensor.micasenseModel ?? 'RedEdge-MX')
    const perBandFactors = calibrationFactors.bandNames.map((name, i) => ({
      band: name,
      factor: calibrationFactors.factors[i],
      wavelength: bands.find((b) => b.name === name)?.centerWavelength ?? 0,
    }))

    const avgConfidence = allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : null

    const report: CalibrationReport = {
      surveyId,
      sensorModel: sensor.model,
      sensorCategory: sensor.category,
      method: allPanelImages.length > 0 ? 'panel-reflectance-calibration' : 'sensor-radiometric-only',
      perBandFactors,
      qa: {
        panelDetectionConfidence: avgConfidence,
        panelImagesFound: allPanelImages.length,
        perBandRSquared: calibrationFactors.rSquared,
        hasDualPanelCapture: hasPreflight && hasPostflight,
        calibrationSuccessRate: flightImages.length > 0
          ? successCount / flightImages.length
          : 0,
        warnings,
      },
      imagesProcessed: successCount,
      processingTimeSec: (Date.now() - start) / 1000,
      timestamp: new Date().toISOString(),
    }

    // Upload report as JSON
    const reportKey = `${outputDir}/calibration_report.json`
    const reportBuffer = Buffer.from(JSON.stringify(report, null, 2))
    await uploadToS3(reportKey, reportBuffer, 'application/json')

    return {
      calibratedPaths,
      report,
      reportPath: reportKey,
    }
  }

  // ─── Thermal calibration pipeline ───────────────────────────────────────

  private async calibrateThermalSurvey(
    surveyId: string,
    sensor: DetectedSensor,
    imagePaths: string[],
    outputDir: string,
    atmosphericParams?: AtmosphericParams,
    startTime?: number,
  ): Promise<CalibrationOutput> {
    const warnings: string[] = []
    const start = startTime ?? Date.now()
    const atmParams = atmosphericParams ?? DEFAULT_SWEDISH_ATMOSPHERIC_PARAMS

    // Get camera specs for default emissivity
    const cameraSpec = sensor.thermalModel
      ? this.flir.getCameraSpec(sensor.thermalModel)
      : null

    if (cameraSpec) {
      atmParams.emissivity = atmParams.emissivity ?? cameraSpec.defaultEmissivity
    }

    const calibratedPaths: string[] = []
    let successCount = 0
    let failCount = 0
    let aggregateStats = { min: Infinity, max: -Infinity, meanSum: 0, count: 0 }

    for (const imgPath of imagePaths) {
      try {
        // Step 1: Extract raw thermal data
        const extraction = await this.flir.extractThermalData(imgPath)

        // Step 2: Calibrate temperature using Planck radiation inversion
        const tempResult = await this.flir.calibrateTemperature(
          extraction.rawThermalPath,
          atmParams,
          extraction.metadata.planck,
        )

        // Step 3: Apply atmospheric correction for altitude
        const altitude = atmParams.distance
        const correctedPath = await this.flir.correctAtmosphere(
          tempResult.temperaturePath,
          altitude,
          atmParams.humidity,
          atmParams.airTemperature,
        )

        calibratedPaths.push(correctedPath)
        successCount++

        // Accumulate statistics
        aggregateStats.min = Math.min(aggregateStats.min, tempResult.stats.min)
        aggregateStats.max = Math.max(aggregateStats.max, tempResult.stats.max)
        aggregateStats.meanSum += tempResult.stats.mean
        aggregateStats.count++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.log.warn({ image: imgPath, error: msg }, 'Failed to calibrate thermal image, skipping')
        failCount++
      }
    }

    if (failCount > 0) {
      warnings.push(`${failCount} of ${imagePaths.length} thermal images failed calibration`)
    }

    if (cameraSpec && cameraSpec.accuracy > 3) {
      warnings.push(
        `Camera accuracy is ±${cameraSpec.accuracy}°C — absolute temperatures may be unreliable. Use relative differences for bark beetle detection.`,
      )
    }

    const temperatureStats = aggregateStats.count > 0
      ? {
          min: aggregateStats.min,
          max: aggregateStats.max,
          mean: aggregateStats.meanSum / aggregateStats.count,
          stdDev: 0, // Would need full pixel-level aggregation for accurate stdDev
        }
      : { min: 0, max: 0, mean: 0, stdDev: 0 }

    const report: CalibrationReport = {
      surveyId,
      sensorModel: sensor.model,
      sensorCategory: sensor.category,
      method: 'planck-radiation-atmospheric-correction',
      perBandFactors: [
        {
          band: 'LWIR',
          factor: atmParams.emissivity ?? 0.95,
          wavelength: 10500, // center of 8-14μm window
        },
      ],
      qa: {
        panelDetectionConfidence: null,
        panelImagesFound: 0,
        perBandRSquared: [],
        hasDualPanelCapture: false,
        calibrationSuccessRate: imagePaths.length > 0
          ? successCount / imagePaths.length
          : 0,
        warnings,
      },
      atmosphericParams: atmParams,
      temperatureStats,
      imagesProcessed: successCount,
      processingTimeSec: (Date.now() - start) / 1000,
      timestamp: new Date().toISOString(),
    }

    // Upload report as JSON
    const reportKey = `${outputDir}/calibration_report.json`
    const reportBuffer = Buffer.from(JSON.stringify(report, null, 2))
    await uploadToS3(reportKey, reportBuffer, 'application/json')

    return {
      calibratedPaths,
      report,
      reportPath: reportKey,
    }
  }

  // ─── No-calibration fallback (RGB) ─────────────────────────────────────

  private async generateNoCalibrationReport(
    surveyId: string,
    sensor: DetectedSensor,
    imagePaths: string[],
    outputDir: string,
    startTime?: number,
  ): Promise<CalibrationOutput> {
    const start = startTime ?? Date.now()

    const report: CalibrationReport = {
      surveyId,
      sensorModel: sensor.model,
      sensorCategory: sensor.category,
      method: 'none',
      perBandFactors: [],
      qa: {
        panelDetectionConfidence: null,
        panelImagesFound: 0,
        perBandRSquared: [],
        hasDualPanelCapture: false,
        calibrationSuccessRate: 1, // No calibration needed = 100% "success"
        warnings: ['RGB sensor detected — no radiometric calibration applied'],
      },
      imagesProcessed: imagePaths.length,
      processingTimeSec: (Date.now() - start) / 1000,
      timestamp: new Date().toISOString(),
    }

    const reportKey = `${outputDir}/calibration_report.json`
    const reportBuffer = Buffer.from(JSON.stringify(report, null, 2))
    await uploadToS3(reportKey, reportBuffer, 'application/json')

    return {
      calibratedPaths: imagePaths, // Pass through unchanged
      report,
      reportPath: reportKey,
    }
  }

  // ─── Database update ───────────────────────────────────────────────────

  private async updateSensorProducts(
    surveyId: string,
    sensorType: string,
    output: CalibrationOutput,
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    try {
      // Upsert a calibration metadata record into sensor_products
      await supabase.from('sensor_products').upsert({
        survey_id: surveyId,
        sensor_type: sensorType,
        product_name: 'calibration',
        storage_path: output.reportPath,
        metadata: {
          method: output.report.method,
          sensorModel: output.report.sensorModel,
          sensorCategory: output.report.sensorCategory,
          calibratedImageCount: output.calibratedPaths.length,
          qa: output.report.qa,
          perBandFactors: output.report.perBandFactors,
          atmosphericParams: output.report.atmosphericParams,
          temperatureStats: output.report.temperatureStats,
          processingTimeSec: output.report.processingTimeSec,
        },
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'survey_id,sensor_type,product_name',
      })

      this.log.debug({ surveyId, sensorType }, 'sensor_products updated with calibration metadata')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log.warn(
        { surveyId, error: msg },
        'Failed to update sensor_products — calibration data saved to S3 only',
      )
    }
  }

  /**
   * Generate a standalone calibration report for a previously calibrated survey.
   * Useful for re-generating reports without re-running calibration.
   */
  async getCalibrationReport(surveyId: string): Promise<CalibrationReport | null> {
    const supabase = getSupabaseAdmin()

    const { data } = await supabase
      .from('sensor_products')
      .select('metadata')
      .eq('survey_id', surveyId)
      .eq('product_name', 'calibration')
      .maybeSingle()

    if (!data?.metadata) return null

    // Reconstruct report from stored metadata
    const meta = data.metadata as Record<string, unknown>
    return {
      surveyId,
      sensorModel: String(meta.sensorModel ?? 'Unknown'),
      sensorCategory: (meta.sensorCategory as SensorCategory) ?? 'unknown',
      method: String(meta.method ?? 'unknown'),
      perBandFactors: (meta.perBandFactors as CalibrationReport['perBandFactors']) ?? [],
      qa: (meta.qa as CalibrationQAMetrics) ?? {
        panelDetectionConfidence: null,
        panelImagesFound: 0,
        perBandRSquared: [],
        hasDualPanelCapture: false,
        calibrationSuccessRate: 0,
        warnings: [],
      },
      atmosphericParams: meta.atmosphericParams as AtmosphericParams | undefined,
      temperatureStats: meta.temperatureStats as CalibrationReport['temperatureStats'],
      imagesProcessed: Number(meta.calibratedImageCount ?? 0),
      processingTimeSec: Number(meta.processingTimeSec ?? 0),
      timestamp: new Date().toISOString(),
    }
  }
}
