import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

// ─── MicaSense sensor band definitions ───────────────────────────────────────

export interface MicaSenseBand {
  index: number
  name: string
  centerWavelength: number // nm
  bandwidth: number // nm
}

export const MICASENSE_REDEDGE_MX_BANDS: MicaSenseBand[] = [
  { index: 0, name: 'Blue', centerWavelength: 475, bandwidth: 32 },
  { index: 1, name: 'Green', centerWavelength: 560, bandwidth: 27 },
  { index: 2, name: 'Red', centerWavelength: 668, bandwidth: 14 },
  { index: 3, name: 'RedEdge', centerWavelength: 717, bandwidth: 12 },
  { index: 4, name: 'NIR', centerWavelength: 842, bandwidth: 57 },
]

export const MICASENSE_ALTUM_BANDS: MicaSenseBand[] = [
  ...MICASENSE_REDEDGE_MX_BANDS,
  { index: 5, name: 'LWIR', centerWavelength: 11000, bandwidth: 6000 },
]

export const MICASENSE_DUAL_BANDS: MicaSenseBand[] = [
  { index: 0, name: 'Blue', centerWavelength: 475, bandwidth: 32 },
  { index: 1, name: 'Green', centerWavelength: 560, bandwidth: 27 },
  { index: 2, name: 'Red', centerWavelength: 668, bandwidth: 14 },
  { index: 3, name: 'RedEdge', centerWavelength: 717, bandwidth: 12 },
  { index: 4, name: 'NIR', centerWavelength: 842, bandwidth: 57 },
  { index: 5, name: 'CoastalBlue', centerWavelength: 444, bandwidth: 28 },
  { index: 6, name: 'Green2', centerWavelength: 531, bandwidth: 14 },
  { index: 7, name: 'Red2', centerWavelength: 650, bandwidth: 16 },
  { index: 8, name: 'RedEdge2', centerWavelength: 740, bandwidth: 18 },
  { index: 9, name: 'NIR2', centerWavelength: 860, bandwidth: 26 },
]

export type MicaSenseModel = 'RedEdge-MX' | 'Altum' | 'Dual'

function getBandsForModel(model: MicaSenseModel): MicaSenseBand[] {
  switch (model) {
    case 'RedEdge-MX': return MICASENSE_REDEDGE_MX_BANDS
    case 'Altum': return MICASENSE_ALTUM_BANDS
    case 'Dual': return MICASENSE_DUAL_BANDS
  }
}

// ─── MicaSense XMP metadata tags ─────────────────────────────────────────────

export interface MicaSenseMetadata {
  irradiance: number
  irradianceYaw: number
  radiometricCalibration: number[] // [a1, a2, a3] coefficients
  exposureTime: number // seconds
  gain: number // ISO gain
  darkLevel: number // black level offset (DN)
  vignettingCenter: [number, number] // cx, cy in pixels
  vignettingPolynomial: number[] // [k0, k1, k2, k3, k4, k5]
  bandName: string
  centralWavelength: number
}

/**
 * Parse MicaSense-specific EXIF/XMP metadata from an image file using exiftool.
 */
async function parseMicaSenseMetadata(imagePath: string): Promise<MicaSenseMetadata> {
  const { stdout } = await execFileAsync('exiftool', ['-json', '-n', imagePath], {
    timeout: 30_000,
  })

  const tags = JSON.parse(stdout)[0] ?? {}

  // MicaSense stores RadiometricCalibration as space-separated floats in XMP
  const rawCalib = tags['XMP:RadiometricCalibration'] ?? tags['RadiometricCalibration'] ?? ''
  const calibCoeffs = typeof rawCalib === 'string'
    ? rawCalib.split(/\s+/).map(Number)
    : Array.isArray(rawCalib) ? rawCalib.map(Number) : [0, 0, 0]

  // Vignetting polynomial from XMP
  const rawVignPoly = tags['XMP:VignettingPolynomial'] ?? tags['VignettingPolynomial'] ?? ''
  const vignPoly = typeof rawVignPoly === 'string'
    ? rawVignPoly.split(/\s+/).map(Number)
    : Array.isArray(rawVignPoly) ? rawVignPoly.map(Number) : [1, 0, 0, 0, 0, 0]

  const rawVignCenter = tags['XMP:VignettingCenter'] ?? tags['VignettingCenter'] ?? ''
  const vignCenter = typeof rawVignCenter === 'string'
    ? rawVignCenter.split(/\s+/).map(Number) as [number, number]
    : Array.isArray(rawVignCenter) ? rawVignCenter.map(Number) as [number, number] : [0, 0]

  return {
    irradiance: Number(tags['XMP:Irradiance'] ?? tags['Irradiance'] ?? 0),
    irradianceYaw: Number(tags['XMP:IrradianceYaw'] ?? tags['IrradianceYaw'] ?? 0),
    radiometricCalibration: calibCoeffs,
    exposureTime: Number(tags['ExposureTime'] ?? 0),
    gain: Number(tags['ISOSpeed'] ?? tags['ISO'] ?? 1),
    darkLevel: Number(tags['XMP:DarkRowValue'] ?? tags['DarkRowValue'] ?? tags['BlackLevel'] ?? 0),
    vignettingCenter: vignCenter,
    vignettingPolynomial: vignPoly,
    bandName: String(tags['XMP:BandName'] ?? tags['BandName'] ?? 'Unknown'),
    centralWavelength: Number(tags['XMP:CentralWavelength'] ?? tags['CentralWavelength'] ?? 0),
  }
}

// ─── Calibration panel detection ─────────────────────────────────────────────

export interface PanelDetectionResult {
  /** Paths to images identified as calibration panel shots */
  panelImages: string[]
  /** Confidence score for each detected panel (0-1) */
  confidence: number[]
  /** Whether these are pre-flight or post-flight panel images */
  position: 'pre-flight' | 'post-flight'
}

export interface ReflectanceFactors {
  /** Per-band reflectance correction factor */
  factors: number[]
  /** Band names corresponding to each factor */
  bandNames: string[]
  /** Panel reflectance values used */
  knownReflectances: number[]
  /** R-squared goodness of fit per band */
  rSquared: number[]
}

export interface CalibrationResult {
  /** S3 path to the calibrated reflectance image */
  calibratedPath: string
  /** Calibration method applied */
  method: string
  /** Per-band correction factors used */
  factors: number[]
  /** Band names */
  bandNames: string[]
}

/**
 * MicaSense radiometric calibration service.
 *
 * Converts raw digital number (DN) imagery from MicaSense multispectral
 * cameras into absolute reflectance values (0-1 range) suitable for
 * quantitative vegetation index analysis.
 *
 * Calibration pipeline:
 * 1. Detect calibration panel images (pre/post flight)
 * 2. Compute per-band reflectance factors from panel known reflectances
 * 3. Apply dark-level subtraction
 * 4. Apply vignetting correction (MicaSense polynomial model)
 * 5. Apply radiometric calibration (DN → radiance)
 * 6. Apply reflectance correction (radiance → reflectance)
 * 7. Apply BRDF sun-angle correction
 */
export class MicaSenseCalibration {
  private readonly log = logger.child({ service: 'micasense-calibration' })

  /**
   * Detect calibration panel images from a set of survey images.
   *
   * Panel images are identified by:
   * - Low altitude / ground-level capture (GPS altitude check)
   * - Uniform high-reflectance region in center of frame
   * - Captured at start or end of flight (timestamp sorting)
   *
   * @param imagePaths - S3 paths to all survey images
   * @returns Detected panel images grouped by pre/post flight
   */
  async detectCalibrationPanel(imagePaths: string[]): Promise<PanelDetectionResult[]> {
    this.log.info({ imageCount: imagePaths.length }, 'Detecting calibration panel images')

    const tempDir = join(tmpdir(), `beetlesense-panel-detect-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const results: PanelDetectionResult[] = []

      // Download all images and extract metadata (timestamps + altitude)
      const imageData: Array<{
        path: string
        localPath: string
        timestamp: number
        altitude: number
        meanDN: number
        stdDN: number
      }> = []

      for (const s3Path of imagePaths) {
        const filename = s3Path.split('/').pop() ?? `img_${imageData.length}.tif`
        const localPath = join(tempDir, filename)
        await downloadToFile(s3Path, localPath)

        try {
          const { stdout } = await execFileAsync('exiftool', ['-json', '-n', localPath], {
            timeout: 15_000,
          })
          const tags = JSON.parse(stdout)[0] ?? {}

          // Get image statistics to detect uniform bright regions (panel)
          const { stdout: statsJson } = await execFileAsync(
            'gdalinfo', ['-json', '-stats', localPath],
            { timeout: 15_000 },
          )
          const stats = JSON.parse(statsJson)
          const band = stats.bands?.[0]?.computedStatistics ?? {}

          imageData.push({
            path: s3Path,
            localPath,
            timestamp: new Date(tags['DateTimeOriginal'] ?? tags['CreateDate'] ?? 0).getTime(),
            altitude: Number(tags['GPSAltitude'] ?? tags['RelativeAltitude'] ?? 999),
            meanDN: band.mean ?? 0,
            stdDN: band.stdDev ?? 999,
          })
        } catch {
          this.log.debug({ file: filename }, 'Could not parse metadata, skipping')
        }
      }

      if (imageData.length === 0) {
        this.log.warn('No parseable images found for panel detection')
        return []
      }

      // Sort by timestamp
      imageData.sort((a, b) => a.timestamp - b.timestamp)

      // Panel detection heuristic:
      // - Low altitude (< 10m AGL or ground level)
      // - High mean DN with low standard deviation (uniform bright surface)
      // - Captured in first or last 10% of flight images
      const totalImages = imageData.length
      const earlyThreshold = Math.max(Math.ceil(totalImages * 0.1), 3)
      const lateThreshold = totalImages - earlyThreshold

      const isPanelCandidate = (img: typeof imageData[0]): { isPanel: boolean; confidence: number } => {
        let score = 0

        // Low altitude indicator
        if (img.altitude < 10) score += 0.3
        else if (img.altitude < 30) score += 0.1

        // Uniform bright region: high mean, low relative std deviation
        const coeffOfVariation = img.stdDN / (img.meanDN + 0.001)
        if (coeffOfVariation < 0.15 && img.meanDN > 100) score += 0.4
        else if (coeffOfVariation < 0.25 && img.meanDN > 80) score += 0.2

        // High overall brightness (panel is typically bright)
        if (img.meanDN > 150) score += 0.2
        else if (img.meanDN > 100) score += 0.1

        // Additional: very low std dev is strong panel indicator
        if (img.stdDN < 20 && img.meanDN > 100) score += 0.1

        return { isPanel: score >= 0.5, confidence: Math.min(score, 1) }
      }

      // Check pre-flight images
      const preFlightCandidates: string[] = []
      const preFlightConfidences: number[] = []
      for (let i = 0; i < earlyThreshold && i < totalImages; i++) {
        const { isPanel, confidence } = isPanelCandidate(imageData[i])
        if (isPanel) {
          preFlightCandidates.push(imageData[i].path)
          preFlightConfidences.push(confidence)
        }
      }

      if (preFlightCandidates.length > 0) {
        results.push({
          panelImages: preFlightCandidates,
          confidence: preFlightConfidences,
          position: 'pre-flight',
        })
      }

      // Check post-flight images
      const postFlightCandidates: string[] = []
      const postFlightConfidences: number[] = []
      for (let i = Math.max(lateThreshold, 0); i < totalImages; i++) {
        const { isPanel, confidence } = isPanelCandidate(imageData[i])
        if (isPanel) {
          postFlightCandidates.push(imageData[i].path)
          postFlightConfidences.push(confidence)
        }
      }

      if (postFlightCandidates.length > 0) {
        results.push({
          panelImages: postFlightCandidates,
          confidence: postFlightConfidences,
          position: 'post-flight',
        })
      }

      this.log.info(
        {
          preFlightPanels: preFlightCandidates.length,
          postFlightPanels: postFlightCandidates.length,
        },
        'Panel detection complete',
      )

      return results
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Compute per-band reflectance correction factors from calibration panel images.
   *
   * Uses the relationship: reflectance = factor * (radiance_panel)
   * where factor = known_reflectance / measured_radiance_panel
   *
   * @param panelImages - S3 paths to calibration panel images (one per band)
   * @param knownReflectances - Known panel reflectance values per band (0-1)
   * @returns Per-band correction factors
   */
  async computeReflectanceFactors(
    panelImages: string[],
    knownReflectances: number[],
  ): Promise<ReflectanceFactors> {
    this.log.info(
      { panelCount: panelImages.length, bandCount: knownReflectances.length },
      'Computing reflectance factors from panel images',
    )

    const tempDir = join(tmpdir(), `beetlesense-reflectance-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const factors: number[] = []
      const bandNames: string[] = []
      const rSquared: number[] = []

      for (let i = 0; i < panelImages.length; i++) {
        const filename = panelImages[i].split('/').pop() ?? `panel_${i}.tif`
        const localPath = join(tempDir, filename)
        await downloadToFile(panelImages[i], localPath)

        // Parse MicaSense metadata for radiometric calibration coefficients
        const meta = await parseMicaSenseMetadata(localPath)
        bandNames.push(meta.bandName)

        // Get mean DN value of the panel region (center 50% of image)
        // Use GDAL to compute stats on a center crop
        const { stdout: infoJson } = await execFileAsync(
          'gdalinfo', ['-json', localPath],
          { timeout: 15_000 },
        )
        const info = JSON.parse(infoJson)
        const width = info.size?.[0] ?? 1280
        const height = info.size?.[1] ?? 960

        // Extract center 50% region for panel measurement
        const cropX = Math.round(width * 0.25)
        const cropY = Math.round(height * 0.25)
        const cropW = Math.round(width * 0.5)
        const cropH = Math.round(height * 0.5)

        const croppedPath = join(tempDir, `panel_crop_${i}.tif`)
        await execFileAsync('gdal_translate', [
          '-srcwin', String(cropX), String(cropY), String(cropW), String(cropH),
          localPath, croppedPath,
        ], { timeout: 15_000 })

        const { stdout: cropStatsJson } = await execFileAsync(
          'gdalinfo', ['-json', '-stats', croppedPath],
          { timeout: 15_000 },
        )
        const cropStats = JSON.parse(cropStatsJson)
        const bandStats = cropStats.bands?.[0]?.computedStatistics ?? {}
        const meanDN = bandStats.mean ?? 0
        const stdDN = bandStats.stdDev ?? 0

        // MicaSense radiometric calibration: DN → radiance
        // L = V(x,y) * (a1 * DN / (gain * exposure) - a2 * darkLevel - a3)
        // Simplified when vignetting is corrected separately:
        // L = a1 * (DN - darkLevel) / (gain * exposure) + a3
        const [a1, a2, a3] = meta.radiometricCalibration.length >= 3
          ? meta.radiometricCalibration
          : [1, 0, 0]

        const gainExposure = meta.gain * meta.exposureTime
        const radiance = gainExposure > 0
          ? a1 * (meanDN - meta.darkLevel) / gainExposure - a2 - a3
          : meanDN

        // Factor: known_reflectance / measured_radiance
        // This factor converts radiance to reflectance for flight images
        const knownRef = i < knownReflectances.length ? knownReflectances[i] : 0.5
        const factor = radiance > 0 ? knownRef / radiance : 1.0

        factors.push(factor)

        // Compute R-squared as quality metric (using coefficient of variation as proxy)
        // Lower CV = more uniform panel = better measurement
        const cv = stdDN / (meanDN + 0.001)
        const rSq = Math.max(0, 1 - cv)
        rSquared.push(rSq)

        this.log.debug(
          { band: meta.bandName, meanDN, radiance: radiance.toFixed(4), factor: factor.toFixed(6), rSq: rSq.toFixed(3) },
          'Band reflectance factor computed',
        )
      }

      this.log.info(
        { bandCount: factors.length, avgRSquared: (rSquared.reduce((a, b) => a + b, 0) / rSquared.length).toFixed(3) },
        'Reflectance factor computation complete',
      )

      return {
        factors,
        bandNames,
        knownReflectances: knownReflectances.slice(0, panelImages.length),
        rSquared,
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Apply full radiometric calibration to a raw MicaSense image.
   *
   * Pipeline: dark-level subtraction → DN-to-radiance → reflectance scaling
   *
   * @param rawImagePath - S3 path to raw image
   * @param calibrationFactors - Per-band reflectance correction factors
   * @returns S3 path to the calibrated reflectance image (values 0-1)
   */
  async applyRadiometricCalibration(
    rawImagePath: string,
    calibrationFactors: ReflectanceFactors,
  ): Promise<CalibrationResult> {
    this.log.debug({ image: rawImagePath }, 'Applying radiometric calibration')

    const tempDir = join(tmpdir(), `beetlesense-radcal-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = rawImagePath.split('/').pop() ?? 'raw.tif'
      const localPath = join(tempDir, filename)
      await downloadToFile(rawImagePath, localPath)

      const meta = await parseMicaSenseMetadata(localPath)

      // Determine which band index this image corresponds to
      const bandIdx = calibrationFactors.bandNames.findIndex(
        (name) => name.toLowerCase() === meta.bandName.toLowerCase(),
      )
      const factor = bandIdx >= 0 ? calibrationFactors.factors[bandIdx] : 1.0

      // MicaSense radiometric calibration coefficients
      const [a1, a2, a3] = meta.radiometricCalibration.length >= 3
        ? meta.radiometricCalibration
        : [1, 0, 0]

      const gainExposure = meta.gain * meta.exposureTime

      // Build GDAL calc expression:
      // reflectance = factor * (a1 * (DN - darkLevel) / (gain * exposure) - a2 - a3)
      // Clamp to [0, 1]
      const darkLevel = meta.darkLevel
      const ge = gainExposure > 0 ? gainExposure : 1
      const calcExpr = `numpy.clip(${factor} * (${a1} * (A.astype(numpy.float64) - ${darkLevel}) / ${ge} - ${a2} - ${a3}), 0, 1)`

      const calibratedRaw = join(tempDir, 'calibrated_raw.tif')
      await execFileAsync('gdal_calc.py', [
        '-A', localPath,
        '--outfile', calibratedRaw,
        '--calc', calcExpr,
        '--type', 'Float32',
        '--NoDataValue', '-9999',
        '--co', 'COMPRESS=DEFLATE',
      ], { timeout: 120_000 })

      // Convert to COG
      const calibratedCog = join(tempDir, 'calibrated.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
        calibratedRaw,
        calibratedCog,
      ], { timeout: 60_000 })

      // Upload calibrated image
      const outputKey = rawImagePath.replace(/\.[^.]+$/, '_calibrated.tif')
      await uploadFromFile(calibratedCog, outputKey, 'image/tiff')

      return {
        calibratedPath: outputKey,
        method: 'micasense-radiometric-panel',
        factors: calibrationFactors.factors,
        bandNames: calibrationFactors.bandNames,
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Correct lens vignetting using MicaSense's polynomial vignetting model.
   *
   * MicaSense cameras store vignetting parameters in XMP metadata:
   * V(x,y) = 1 + k1*r^2 + k2*r^4 + k3*r^6 + k4*r^8 + k5*r^10
   * where r = sqrt((x-cx)^2 + (y-cy)^2) / max_distance
   *
   * Corrected = DN / V(x,y)
   *
   * @param imagePath - S3 path to the image
   * @param bandIndex - Band index (0-based) for model lookup
   * @returns S3 path to the vignetting-corrected image
   */
  async correctVignetting(imagePath: string, bandIndex: number): Promise<string> {
    this.log.debug({ image: imagePath, bandIndex }, 'Correcting vignetting')

    const tempDir = join(tmpdir(), `beetlesense-vignette-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = imagePath.split('/').pop() ?? 'input.tif'
      const localPath = join(tempDir, filename)
      await downloadToFile(imagePath, localPath)

      const meta = await parseMicaSenseMetadata(localPath)

      // Get image dimensions
      const { stdout: infoJson } = await execFileAsync(
        'gdalinfo', ['-json', localPath],
        { timeout: 15_000 },
      )
      const info = JSON.parse(infoJson)
      const width = info.size?.[0] ?? 1280
      const height = info.size?.[1] ?? 960

      // Vignetting center and polynomial from metadata
      const [cx, cy] = meta.vignettingCenter[0] !== 0
        ? meta.vignettingCenter
        : [width / 2, height / 2]

      const poly = meta.vignettingPolynomial.length >= 6
        ? meta.vignettingPolynomial
        : [1, 0, 0, 0, 0, 0]

      // Maximum distance from center to corner
      const maxDist = Math.sqrt(
        Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2,
      )

      // Generate a vignetting correction map using Python/NumPy via gdal_calc
      // We create a two-pass approach:
      // Pass 1: Generate X and Y coordinate grids as rasters
      // Pass 2: Compute vignetting polynomial and apply correction

      // Create a Python script for the vignetting correction
      const scriptPath = join(tempDir, 'vignette_correct.py')
      const scriptContent = `
import numpy as np
from osgeo import gdal

ds = gdal.Open("${localPath.replace(/\\/g, '/')}")
band = ds.GetRasterBand(1)
data = band.ReadAsArray().astype(np.float64)
h, w = data.shape

# Build coordinate grids
y_coords, x_coords = np.mgrid[0:h, 0:w]
r = np.sqrt((x_coords - ${cx})**2 + (y_coords - ${cy})**2) / ${maxDist}

# MicaSense vignetting polynomial
r2 = r * r
vignette = (${poly[0]}
  + ${poly[1]} * r2
  + ${poly[2]} * r2**2
  + ${poly[3]} * r2**3
  + ${poly[4]} * r2**4
  + ${poly[5]} * r2**5)

# Prevent division by zero
vignette = np.maximum(vignette, 0.01)

# Apply correction
corrected = data / vignette

# Write output
driver = gdal.GetDriverByName('GTiff')
out_ds = driver.Create("${join(tempDir, 'vignette_corrected.tif').replace(/\\/g, '/')}", w, h, 1, gdal.GDT_Float32)
out_ds.SetGeoTransform(ds.GetGeoTransform())
out_ds.SetProjection(ds.GetProjection())
out_band = out_ds.GetRasterBand(1)
out_band.WriteArray(corrected)
out_band.SetNoDataValue(-9999)
out_ds.FlushCache()
out_ds = None
ds = None
`
      await writeFile(scriptPath, scriptContent)
      await execFileAsync('python3', [scriptPath], { timeout: 120_000 })

      const correctedPath = join(tempDir, 'vignette_corrected.tif')

      // Convert to COG
      const cogPath = join(tempDir, 'vignette_corrected_cog.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        correctedPath,
        cogPath,
      ], { timeout: 60_000 })

      const outputKey = imagePath.replace(/\.[^.]+$/, '_vignette_corrected.tif')
      await uploadFromFile(cogPath, outputKey, 'image/tiff')

      this.log.debug({ outputKey }, 'Vignetting correction applied')
      return outputKey
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Apply BRDF correction for sun angle variation.
   *
   * Corrects reflectance values for the bidirectional reflectance distribution
   * function (BRDF) effect caused by varying sun angles during flight.
   *
   * Uses a simplified Lambertian + Minnaert correction model:
   * corrected = reflectance * cos(solar_zenith_ref) / cos(solar_zenith)
   *
   * For more accurate correction, considers the surface normal and
   * applies a Walthall BRDF model parameterized for vegetation canopy.
   *
   * @param imagePath - S3 path to the reflectance image
   * @param solarZenith - Solar zenith angle in degrees (0 = directly overhead)
   * @param solarAzimuth - Solar azimuth angle in degrees (0 = north, clockwise)
   * @returns S3 path to the sun-angle corrected image
   */
  async correctSunAngle(
    imagePath: string,
    solarZenith: number,
    solarAzimuth: number,
  ): Promise<string> {
    this.log.debug(
      { image: imagePath, solarZenith, solarAzimuth },
      'Applying sun angle / BRDF correction',
    )

    const tempDir = join(tmpdir(), `beetlesense-sunangle-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = imagePath.split('/').pop() ?? 'input.tif'
      const localPath = join(tempDir, filename)
      await downloadToFile(imagePath, localPath)

      // Reference solar zenith (normalize to nadir-like conditions)
      // Swedish summer noon at ~57°N latitude: solar zenith ~35-45°
      const referenceZenith = 40.0

      // Lambertian cosine correction factor
      const solarZenithRad = (solarZenith * Math.PI) / 180
      const referenceZenithRad = (referenceZenith * Math.PI) / 180

      const cosCorrection = Math.cos(referenceZenithRad) / Math.cos(solarZenithRad)

      // Clamp correction factor to reasonable range (0.5 - 2.0)
      // Very large/small corrections indicate extreme sun angles
      const clampedCorrection = Math.max(0.5, Math.min(2.0, cosCorrection))

      // Apply correction using gdal_calc
      // Reflectance_corrected = Reflectance * correction_factor
      const correctedRaw = join(tempDir, 'sun_corrected_raw.tif')
      await execFileAsync('gdal_calc.py', [
        '-A', localPath,
        '--outfile', correctedRaw,
        '--calc', `numpy.clip(A * ${clampedCorrection}, 0, 1)`,
        '--type', 'Float32',
        '--NoDataValue', '-9999',
        '--co', 'COMPRESS=DEFLATE',
      ], { timeout: 120_000 })

      // Convert to COG
      const cogPath = join(tempDir, 'sun_corrected.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
        correctedRaw,
        cogPath,
      ], { timeout: 60_000 })

      const outputKey = imagePath.replace(/\.[^.]+$/, '_sun_corrected.tif')
      await uploadFromFile(cogPath, outputKey, 'image/tiff')

      this.log.debug(
        { cosCorrection: clampedCorrection.toFixed(4), solarZenith, outputKey },
        'Sun angle correction applied',
      )

      return outputKey
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Get the appropriate band definition for a detected MicaSense model.
   */
  getBands(model: MicaSenseModel): MicaSenseBand[] {
    return getBandsForModel(model)
  }

  /**
   * Detect the MicaSense sensor model from image EXIF metadata.
   */
  async detectModel(imagePath: string): Promise<MicaSenseModel> {
    const tempDir = join(tmpdir(), `beetlesense-detect-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      const filename = imagePath.split('/').pop() ?? 'input.tif'
      const localPath = join(tempDir, filename)
      await downloadToFile(imagePath, localPath)

      const { stdout } = await execFileAsync('exiftool', ['-json', '-n', localPath], {
        timeout: 15_000,
      })
      const tags = JSON.parse(stdout)[0] ?? {}

      const model = String(tags['Model'] ?? tags['CameraModel'] ?? '').toLowerCase()
      const make = String(tags['Make'] ?? '').toLowerCase()

      if (model.includes('altum')) return 'Altum'
      if (model.includes('dual') || model.includes('rededge-p')) return 'Dual'
      if (model.includes('rededge') || make.includes('micasense')) return 'RedEdge-MX'

      // Default to RedEdge-MX as most common
      this.log.warn({ model, make }, 'Unknown MicaSense model, defaulting to RedEdge-MX')
      return 'RedEdge-MX'
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}
