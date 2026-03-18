import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

// ─── Supported thermal camera models ────────────────────────────────────────

export type ThermalCameraModel =
  | 'DJI-H20T'
  | 'DJI-M30T'
  | 'FLIR-Vue-Pro'
  | 'FLIR-Duo-Pro'
  | 'unknown'

export interface ThermalCameraSpec {
  model: ThermalCameraModel
  resolution: [number, number]
  spectralRange: [number, number] // μm
  accuracy: number // ±°C
  defaultEmissivity: number
  /** Whether the camera outputs radiometric JPEG (R-JPEG) */
  supportsRJPEG: boolean
}

export const THERMAL_CAMERA_SPECS: Record<ThermalCameraModel, ThermalCameraSpec> = {
  'DJI-H20T': {
    model: 'DJI-H20T',
    resolution: [640, 512],
    spectralRange: [8, 14],
    accuracy: 2,
    defaultEmissivity: 0.95,
    supportsRJPEG: true,
  },
  'DJI-M30T': {
    model: 'DJI-M30T',
    resolution: [640, 512],
    spectralRange: [8, 14],
    accuracy: 2,
    defaultEmissivity: 0.95,
    supportsRJPEG: true,
  },
  'FLIR-Vue-Pro': {
    model: 'FLIR-Vue-Pro',
    resolution: [640, 512],
    spectralRange: [7.5, 13.5],
    accuracy: 5,
    defaultEmissivity: 0.95,
    supportsRJPEG: true,
  },
  'FLIR-Duo-Pro': {
    model: 'FLIR-Duo-Pro',
    resolution: [640, 512],
    spectralRange: [7.5, 13.5],
    accuracy: 5,
    defaultEmissivity: 0.95,
    supportsRJPEG: true,
  },
  'unknown': {
    model: 'unknown',
    resolution: [640, 512],
    spectralRange: [8, 14],
    accuracy: 5,
    defaultEmissivity: 0.95,
    supportsRJPEG: false,
  },
}

// ─── FLIR Planck calibration constants ──────────────────────────────────────

export interface FlirPlanckConstants {
  /** Planck R1 constant */
  R1: number
  /** Planck R2 constant */
  R2: number
  /** Planck B constant */
  B: number
  /** Planck F constant */
  F: number
  /** Planck O constant (raw value offset) */
  O: number
  /** Atmospheric transmission alpha 1 */
  atAlpha1: number
  /** Atmospheric transmission alpha 2 */
  atAlpha2: number
  /** Atmospheric transmission beta 1 */
  atBeta1: number
  /** Atmospheric transmission beta 2 */
  atBeta2: number
  /** Atmospheric transmission X */
  atX: number
}

/** Default Planck constants for uncalibrated FLIR cameras */
const DEFAULT_PLANCK: FlirPlanckConstants = {
  R1: 14906.216,
  R2: 0.010956882,
  B: 1396.5,
  F: 1.0,
  O: -7340,
  atAlpha1: 0.006569,
  atAlpha2: 0.01262,
  atBeta1: -0.002276,
  atBeta2: -0.00667,
  atX: 1.9,
}

// ─── Atmospheric parameters ─────────────────────────────────────────────────

export interface AtmosphericParams {
  /** Distance from camera to target in meters */
  distance: number
  /** Relative humidity (0-1) */
  humidity: number
  /** Air temperature in °C */
  airTemperature: number
  /** Emissivity of the target surface (0-1, default 0.95 for vegetation) */
  emissivity?: number
  /** Reflected apparent temperature in °C (typically same as air temp) */
  reflectedTemperature?: number
}

// ─── FLIR EXIF metadata ─────────────────────────────────────────────────────

export interface FlirExifMetadata {
  planck: FlirPlanckConstants
  /** Raw thermal image width */
  rawWidth: number
  /** Raw thermal image height */
  rawHeight: number
  /** Camera model string */
  cameraModel: string
  /** Emissivity stored in image metadata */
  emissivity: number
  /** Object distance in meters */
  objectDistance: number
  /** Relative humidity (0-1) */
  relativeHumidity: number
  /** Atmospheric temperature in °C */
  atmosphericTemperature: number
  /** Reflected apparent temperature in °C */
  reflectedApparentTemperature: number
  /** IR window temperature in °C */
  irWindowTemperature: number
  /** IR window transmission (0-1) */
  irWindowTransmission: number
}

/**
 * Parse FLIR-specific EXIF metadata from a radiometric image using exiftool.
 */
async function parseFlirExifMetadata(imagePath: string): Promise<FlirExifMetadata> {
  const { stdout } = await execFileAsync('exiftool', ['-json', '-n', imagePath], {
    timeout: 30_000,
  })

  const tags = JSON.parse(stdout)[0] ?? {}

  return {
    planck: {
      R1: Number(tags['PlanckR1'] ?? DEFAULT_PLANCK.R1),
      R2: Number(tags['PlanckR2'] ?? DEFAULT_PLANCK.R2),
      B: Number(tags['PlanckB'] ?? DEFAULT_PLANCK.B),
      F: Number(tags['PlanckF'] ?? DEFAULT_PLANCK.F),
      O: Number(tags['PlanckO'] ?? DEFAULT_PLANCK.O),
      atAlpha1: Number(tags['AtmosphericTransAlpha1'] ?? DEFAULT_PLANCK.atAlpha1),
      atAlpha2: Number(tags['AtmosphericTransAlpha2'] ?? DEFAULT_PLANCK.atAlpha2),
      atBeta1: Number(tags['AtmosphericTransBeta1'] ?? DEFAULT_PLANCK.atBeta1),
      atBeta2: Number(tags['AtmosphericTransBeta2'] ?? DEFAULT_PLANCK.atBeta2),
      atX: Number(tags['AtmosphericTransX'] ?? DEFAULT_PLANCK.atX),
    },
    rawWidth: Number(tags['RawThermalImageWidth'] ?? tags['ImageWidth'] ?? 640),
    rawHeight: Number(tags['RawThermalImageHeight'] ?? tags['ImageHeight'] ?? 512),
    cameraModel: String(tags['Model'] ?? tags['CameraModel'] ?? 'Unknown'),
    emissivity: Number(tags['Emissivity'] ?? 0.95),
    objectDistance: Number(tags['ObjectDistance'] ?? 50),
    relativeHumidity: Number(tags['RelativeHumidity'] ?? 0.5),
    atmosphericTemperature: Number(tags['AtmosphericTemperature'] ?? 20),
    reflectedApparentTemperature: Number(tags['ReflectedApparentTemperature'] ?? 20),
    irWindowTemperature: Number(tags['IRWindowTemperature'] ?? 20),
    irWindowTransmission: Number(tags['IRWindowTransmission'] ?? 1.0),
  }
}

// ─── Thermal calibration outputs ────────────────────────────────────────────

export interface ThermalExtractionResult {
  /** Local path to raw thermal data as 16-bit TIFF */
  rawThermalPath: string
  /** FLIR metadata extracted from the image */
  metadata: FlirExifMetadata
  /** Raw value statistics */
  stats: { min: number; max: number; mean: number; stdDev: number }
}

export interface TemperatureCalibrationResult {
  /** S3 path to calibrated temperature raster (°C, Float32) */
  temperaturePath: string
  /** Temperature statistics */
  stats: { min: number; max: number; mean: number; stdDev: number }
  /** Calibration parameters used */
  params: {
    emissivity: number
    atmosphericTransmission: number
    reflectedTemperature: number
    method: string
  }
}

/**
 * FLIR thermal calibration service.
 *
 * Converts raw radiometric thermal data from FLIR and DJI thermal cameras
 * into absolute temperature values (°C) with atmospheric and emissivity
 * corrections suitable for bark beetle stress detection in forest canopy.
 *
 * Calibration pipeline:
 * 1. Extract raw thermal data from R-JPEG or TIFF
 * 2. Parse Planck calibration constants from EXIF metadata
 * 3. Compute atmospheric transmission (distance, humidity, air temp)
 * 4. Convert raw values → radiance using Planck equation
 * 5. Apply emissivity and reflected apparent temperature corrections
 * 6. Convert radiance → absolute temperature (°C)
 *
 * For bark beetle detection, relative temperature differences of 2-4°C
 * between healthy and infested trees are the primary signal. Infested
 * trees show elevated crown temperature due to reduced transpiration.
 */
export class FlirCalibration {
  private readonly log = logger.child({ service: 'flir-calibration' })

  /**
   * Extract raw thermal data from a FLIR radiometric JPEG (R-JPEG) or TIFF.
   *
   * FLIR R-JPEG stores raw 16-bit thermal data embedded within the JPEG
   * alongside the visible image. exiftool can extract this embedded data.
   * DJI thermal cameras store thermal data as the primary TIFF band or
   * as an embedded thermal image in the R-JPEG.
   *
   * @param rawImagePath - S3 path to the raw thermal image
   * @returns Extracted raw thermal data with metadata
   */
  async extractThermalData(rawImagePath: string): Promise<ThermalExtractionResult> {
    this.log.debug({ image: rawImagePath }, 'Extracting thermal data from R-JPEG')

    const tempDir = join(tmpdir(), `beetlesense-thermal-extract-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = rawImagePath.split('/').pop() ?? 'thermal.jpg'
      const localPath = join(tempDir, filename)
      await downloadToFile(rawImagePath, localPath)

      // Parse FLIR EXIF metadata
      const metadata = await parseFlirExifMetadata(localPath)

      // Attempt to extract embedded raw thermal image from R-JPEG
      // exiftool can extract the raw thermal data as a separate file
      const rawThermalPath = join(tempDir, 'raw_thermal.tiff')
      const isJpeg = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')

      if (isJpeg) {
        // Extract embedded raw thermal image from R-JPEG using exiftool
        try {
          await execFileAsync('exiftool', [
            '-b', '-RawThermalImage', localPath,
          ], {
            timeout: 30_000,
            maxBuffer: 50 * 1024 * 1024, // 50MB for embedded data
          }).then(async ({ stdout }) => {
            // Write binary data to file
            await writeFile(rawThermalPath, stdout, 'binary')
          })

          this.log.debug('Extracted embedded raw thermal image from R-JPEG')
        } catch {
          // If R-JPEG extraction fails, try using the JPEG as-is (DJI format)
          this.log.debug('R-JPEG extraction failed, using image directly')

          // Convert to 16-bit TIFF preserving the thermal data
          await execFileAsync('gdal_translate', [
            '-of', 'GTiff',
            '-ot', 'UInt16',
            localPath,
            rawThermalPath,
          ], { timeout: 30_000 })
        }
      } else {
        // Already a TIFF — just ensure it is UInt16
        await execFileAsync('gdal_translate', [
          '-of', 'GTiff',
          '-ot', 'UInt16',
          localPath,
          rawThermalPath,
        ], { timeout: 30_000 })
      }

      // Get statistics of the raw thermal data
      const { stdout: statsJson } = await execFileAsync(
        'gdalinfo', ['-json', '-stats', rawThermalPath],
        { timeout: 15_000 },
      )
      const statsInfo = JSON.parse(statsJson)
      const bandStats = statsInfo.bands?.[0]?.computedStatistics ?? {}

      const result: ThermalExtractionResult = {
        rawThermalPath,
        metadata,
        stats: {
          min: bandStats.minimum ?? 0,
          max: bandStats.maximum ?? 0,
          mean: bandStats.mean ?? 0,
          stdDev: bandStats.stdDev ?? 0,
        },
      }

      this.log.debug(
        { rawRange: `${result.stats.min}-${result.stats.max}`, model: metadata.cameraModel },
        'Raw thermal data extracted',
      )

      return result
    } catch (err) {
      // Clean up on error — caller cannot access tempDir files
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      throw err
    }
    // Note: tempDir is NOT cleaned up here because caller needs rawThermalPath.
    // Caller is responsible for cleanup or the orchestrator handles it.
  }

  /**
   * Convert raw sensor values to absolute temperature (°C).
   *
   * Uses the FLIR Planck radiation law inversion formula:
   *
   *   raw_at_obj = (raw - (1-τ) * raw_refl - (1-ε) * raw_refl) / (ε * τ)
   *
   *   T = B / ln(R1 / (R2 * (raw_at_obj + O)) + F) - 273.15
   *
   * Where:
   * - τ = atmospheric transmission
   * - ε = emissivity
   * - raw_refl = Planck radiation for reflected apparent temperature
   * - R1, R2, B, F, O = camera Planck calibration constants
   *
   * @param rawValues - Path to raw thermal data (local file from extractThermalData)
   * @param atmosphericParams - Atmospheric correction parameters
   * @param planckConstants - Camera Planck calibration constants (from EXIF)
   * @returns Calibrated temperature data
   */
  async calibrateTemperature(
    rawValues: string,
    atmosphericParams: AtmosphericParams,
    planckConstants?: FlirPlanckConstants,
  ): Promise<TemperatureCalibrationResult> {
    this.log.info(
      {
        distance: atmosphericParams.distance,
        humidity: atmosphericParams.humidity,
        airTemp: atmosphericParams.airTemperature,
        emissivity: atmosphericParams.emissivity,
      },
      'Calibrating raw thermal values to absolute temperature',
    )

    const tempDir = join(tmpdir(), `beetlesense-tempcal-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const planck = planckConstants ?? DEFAULT_PLANCK

      const emissivity = atmosphericParams.emissivity ?? 0.95
      const reflectedTemp = atmosphericParams.reflectedTemperature ?? atmosphericParams.airTemperature
      const distance = atmosphericParams.distance
      const humidity = atmosphericParams.humidity
      const airTemp = atmosphericParams.airTemperature

      // Step 1: Compute atmospheric transmission (τ)
      // FLIR formula: τ = X * exp(-sqrt(d) * (α1 + β1 * sqrt(H))) +
      //               (1-X) * exp(-sqrt(d) * (α2 + β2 * sqrt(H)))
      // where d = distance, H = humidity * exp(1.5587 + ... + air_temp terms)
      const h2o = humidity * Math.exp(
        1.5587
        + 6.939e-2 * airTemp
        - 2.7816e-4 * airTemp ** 2
        + 6.8455e-7 * airTemp ** 3,
      )

      const tau = planck.atX * Math.exp(
        -Math.sqrt(distance) * (planck.atAlpha1 + planck.atBeta1 * Math.sqrt(h2o)),
      ) + (1 - planck.atX) * Math.exp(
        -Math.sqrt(distance) * (planck.atAlpha2 + planck.atBeta2 * Math.sqrt(h2o)),
      )

      // Step 2: Compute raw value equivalent for reflected apparent temperature
      // raw_refl = R1 / (R2 * (exp(B / (T_refl + 273.15)) - F)) - O
      const reflectedTempK = reflectedTemp + 273.15
      const rawRefl = planck.R1 / (planck.R2 * (Math.exp(planck.B / reflectedTempK) - planck.F)) - planck.O

      // Step 3: Compute raw value equivalent for atmospheric temperature
      const airTempK = airTemp + 273.15
      const rawAtm = planck.R1 / (planck.R2 * (Math.exp(planck.B / airTempK) - planck.F)) - planck.O

      // Step 4: Build the full temperature conversion expression for GDAL
      // raw_obj = (A - (1-tau)*raw_atm - (1-emissivity)*tau*raw_refl) / (emissivity * tau)
      // T(°C) = B / ln(R1 / (R2 * (raw_obj + O)) + F) - 273.15

      const scriptPath = join(tempDir, 'temp_calibrate.py')
      const outputPath = join(tempDir, 'temperature.tif')
      const scriptContent = `
import numpy as np
from osgeo import gdal

ds = gdal.Open("${rawValues.replace(/\\/g, '/')}")
band = ds.GetRasterBand(1)
raw = band.ReadAsArray().astype(np.float64)

# Atmospheric correction parameters
tau = ${tau}
emissivity = ${emissivity}
raw_refl = ${rawRefl}
raw_atm = ${rawAtm}

# Planck constants
R1 = ${planck.R1}
R2 = ${planck.R2}
B = ${planck.B}
F = ${planck.F}
O = ${planck.O}

# Step 1: Correct for atmospheric and reflected radiation
# raw_object = (raw_total - atmospheric_contribution - reflected_contribution) / (emissivity * transmission)
raw_obj = (raw - (1.0 - tau) * raw_atm - (1.0 - emissivity) * tau * raw_refl) / (emissivity * tau)

# Step 2: Convert to temperature using inverse Planck equation
# T = B / ln(R1 / (R2 * (raw_obj + O)) + F) - 273.15
denominator = R2 * (raw_obj + O)
# Prevent division by zero and log of negative numbers
denominator = np.maximum(denominator, 1e-10)
ratio = R1 / denominator + F
ratio = np.maximum(ratio, 1.001)  # Ensure log argument > 1
temperature = B / np.log(ratio) - 273.15

# Clamp to reasonable temperature range for drone survey (-40 to +80 °C)
temperature = np.clip(temperature, -40, 80)

# Write output
h, w = temperature.shape
driver = gdal.GetDriverByName('GTiff')
out_ds = driver.Create("${outputPath.replace(/\\/g, '/')}", w, h, 1, gdal.GDT_Float32,
                        options=['COMPRESS=DEFLATE'])
out_ds.SetGeoTransform(ds.GetGeoTransform())
out_ds.SetProjection(ds.GetProjection())
out_band = out_ds.GetRasterBand(1)
out_band.WriteArray(temperature.astype(np.float32))
out_band.SetNoDataValue(-9999)
out_ds.FlushCache()
out_ds = None
ds = None
`
      await writeFile(scriptPath, scriptContent)
      await execFileAsync('python3', [scriptPath], { timeout: 120_000 })

      // Get temperature statistics
      const { stdout: statsJson } = await execFileAsync(
        'gdalinfo', ['-json', '-stats', outputPath],
        { timeout: 15_000 },
      )
      const statsInfo = JSON.parse(statsJson)
      const bandStats = statsInfo.bands?.[0]?.computedStatistics ?? {}

      // Convert to COG
      const cogPath = join(tempDir, 'temperature_cog.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
        outputPath,
        cogPath,
      ], { timeout: 60_000 })

      // Upload to S3
      const s3Key = rawValues.replace(/\.[^.]+$/, '_temperature.tif').replace(/.*\//, 'calibrated/')
      // Use the parent directory structure from the raw path
      const outputKey = `calibrated/thermal/${randomUUID()}_temperature.tif`
      await uploadFromFile(cogPath, outputKey, 'image/tiff')

      const result: TemperatureCalibrationResult = {
        temperaturePath: outputKey,
        stats: {
          min: bandStats.minimum ?? -40,
          max: bandStats.maximum ?? 80,
          mean: bandStats.mean ?? 20,
          stdDev: bandStats.stdDev ?? 5,
        },
        params: {
          emissivity,
          atmosphericTransmission: tau,
          reflectedTemperature: reflectedTemp,
          method: 'planck-radiation-inversion',
        },
      }

      this.log.info(
        {
          tempRange: `${result.stats.min.toFixed(1)}-${result.stats.max.toFixed(1)}°C`,
          tau: tau.toFixed(4),
          emissivity,
        },
        'Temperature calibration complete',
      )

      return result
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Apply atmospheric absorption correction to a thermal image.
   *
   * Accounts for atmospheric absorption of infrared radiation between
   * the target and the sensor, which increases with altitude, humidity,
   * and air temperature.
   *
   * @param thermalImage - S3 path to a temperature image (°C)
   * @param altitude - Flight altitude above ground in meters
   * @param humidity - Relative humidity (0-1)
   * @param airTemp - Air temperature in °C
   * @returns S3 path to the atmosphere-corrected temperature image
   */
  async correctAtmosphere(
    thermalImage: string,
    altitude: number,
    humidity: number,
    airTemp: number,
  ): Promise<string> {
    this.log.debug(
      { image: thermalImage, altitude, humidity, airTemp },
      'Applying atmospheric absorption correction',
    )

    const tempDir = join(tmpdir(), `beetlesense-atmcorr-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = thermalImage.split('/').pop() ?? 'thermal.tif'
      const localPath = join(tempDir, filename)
      await downloadToFile(thermalImage, localPath)

      // Compute atmospheric transmission for the given altitude
      // Using the simplified LOWTRAN model for 8-14μm spectral window
      const h2o = humidity * Math.exp(
        1.5587
        + 6.939e-2 * airTemp
        - 2.7816e-4 * airTemp ** 2
        + 6.8455e-7 * airTemp ** 3,
      )

      // Transmission decreases with path length (altitude for nadir-looking camera)
      // and water vapor content
      const tau = DEFAULT_PLANCK.atX * Math.exp(
        -Math.sqrt(altitude) * (DEFAULT_PLANCK.atAlpha1 + DEFAULT_PLANCK.atBeta1 * Math.sqrt(h2o)),
      ) + (1 - DEFAULT_PLANCK.atX) * Math.exp(
        -Math.sqrt(altitude) * (DEFAULT_PLANCK.atAlpha2 + DEFAULT_PLANCK.atBeta2 * Math.sqrt(h2o)),
      )

      // Atmospheric correction:
      // T_corrected = (T_measured - (1-τ) * T_atm) / τ
      // This removes the atmospheric self-emission contribution and
      // compensates for atmospheric absorption
      const correctedRaw = join(tempDir, 'atm_corrected_raw.tif')
      await execFileAsync('gdal_calc.py', [
        '-A', localPath,
        '--outfile', correctedRaw,
        '--calc', `numpy.clip((A - (1.0 - ${tau}) * ${airTemp}) / ${tau}, -40, 80)`,
        '--type', 'Float32',
        '--NoDataValue', '-9999',
        '--co', 'COMPRESS=DEFLATE',
      ], { timeout: 120_000 })

      // Convert to COG
      const cogPath = join(tempDir, 'atm_corrected.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
        correctedRaw,
        cogPath,
      ], { timeout: 60_000 })

      const outputKey = thermalImage.replace(/\.[^.]+$/, '_atm_corrected.tif')
      await uploadFromFile(cogPath, outputKey, 'image/tiff')

      this.log.debug(
        { tau: tau.toFixed(4), altitude, outputKey },
        'Atmospheric correction applied',
      )

      return outputKey
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Detect the thermal camera model from image EXIF metadata.
   */
  async detectCameraModel(imagePath: string): Promise<ThermalCameraModel> {
    const tempDir = join(tmpdir(), `beetlesense-detect-thermal-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = imagePath.split('/').pop() ?? 'input.jpg'
      const localPath = join(tempDir, filename)
      await downloadToFile(imagePath, localPath)

      const { stdout } = await execFileAsync('exiftool', ['-json', '-n', localPath], {
        timeout: 15_000,
      })
      const tags = JSON.parse(stdout)[0] ?? {}

      const model = String(tags['Model'] ?? tags['CameraModel'] ?? '').toLowerCase()
      const make = String(tags['Make'] ?? '').toLowerCase()

      if (model.includes('h20t') || model.includes('zenmuse h20t')) return 'DJI-H20T'
      if (model.includes('m30t') || model.includes('matrice 30t')) return 'DJI-M30T'
      if (model.includes('vue pro') || (make.includes('flir') && model.includes('vue'))) return 'FLIR-Vue-Pro'
      if (model.includes('duo pro') || (make.includes('flir') && model.includes('duo'))) return 'FLIR-Duo-Pro'

      // Check for DJI thermal cameras by make
      if (make.includes('dji') && (model.includes('thermal') || model.includes('ir'))) {
        return 'DJI-H20T' // Default DJI thermal
      }

      // Check for FLIR cameras by make
      if (make.includes('flir') || make.includes('teledyne')) {
        return 'FLIR-Vue-Pro' // Default FLIR
      }

      this.log.warn({ model, make }, 'Unknown thermal camera model')
      return 'unknown'
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Get camera specifications for a detected model.
   */
  getCameraSpec(model: ThermalCameraModel): ThermalCameraSpec {
    return THERMAL_CAMERA_SPECS[model]
  }
}
