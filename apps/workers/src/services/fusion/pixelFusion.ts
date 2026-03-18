import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { downloadToFile, uploadFromFile, buildParcelPath } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

/**
 * Derived fusion products from multi-sensor pixel-level analysis.
 */
export interface FusionProduct {
  name: string
  label: string
  storagePath: string
  sensorsUsed: string[]
  stats: { min: number; max: number; mean: number }
}

/**
 * PixelFusionService — combines aligned sensor products into
 * derived data products at the pixel level.
 *
 * Each output pixel is computed from the corresponding pixels across
 * all available sensor layers (multispectral, thermal, LiDAR, RGB).
 *
 * Derived products:
 * 1. Beetle Stress Index: thermal anomaly × (1 - NDRE) — high = likely infestation
 * 2. Crown Health Index: NDVI × NDRE × (1 - thermal_anomaly_normalized)
 * 3. Moisture Stress: spectral moisture × thermal, weighted by canopy height
 * 4. Timber Value Proxy: CHM × NDVI (tall healthy trees = high value)
 */
export class PixelFusionService {
  private readonly log = logger.child({ service: 'pixel-fusion' })

  /**
   * Run pixel-level fusion for a survey.
   * Pulls all sensor_products for the survey and computes derived products.
   */
  async fuseSurvey(
    surveyId: string,
    parcelId: string,
  ): Promise<FusionProduct[]> {
    this.log.info({ surveyId, parcelId }, 'Starting pixel-level fusion')

    const supabase = getSupabaseAdmin()
    const tempDir = join(tmpdir(), `beetlesense-fusion-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      // Fetch all sensor products for this survey
      const { data: products } = await supabase
        .from('sensor_products')
        .select('sensor_type, product_name, storage_path')
        .eq('survey_id', surveyId)

      if (!products || products.length === 0) {
        this.log.warn({ surveyId }, 'No sensor products found for fusion')
        return []
      }

      // Build a map of available layers
      const layers: Record<string, string> = {}
      for (const p of products) {
        const key = `${p.sensor_type}/${p.product_name}`
        layers[key] = p.storage_path
      }

      this.log.info(
        { availableLayers: Object.keys(layers) },
        'Available sensor layers for fusion',
      )

      // Download available layers
      const localLayers: Record<string, string> = {}
      for (const [key, s3Path] of Object.entries(layers)) {
        const safeName = key.replace(/\//g, '_')
        const localPath = join(tempDir, `${safeName}.tif`)
        await downloadToFile(s3Path, localPath)
        localLayers[key] = localPath
      }

      // Get reference dimensions from the first available layer
      const refLayer = Object.values(localLayers)[0]
      const { stdout: refJson } = await execFileAsync('gdalinfo', ['-json', refLayer])
      const refInfo = JSON.parse(refJson)
      const refSize = refInfo.size ?? [100, 100]
      const refExtent = refInfo.cornerCoordinates ?? {}
      const te = [
        refExtent.lowerLeft?.[0] ?? 0,
        refExtent.lowerLeft?.[1] ?? 0,
        refExtent.upperRight?.[0] ?? 0,
        refExtent.upperRight?.[1] ?? 0,
      ]

      // Align all layers to the same grid
      const aligned: Record<string, string> = {}
      for (const [key, localPath] of Object.entries(localLayers)) {
        const outPath = join(tempDir, `aligned_${key.replace(/\//g, '_')}.tif`)
        await execFileAsync('gdalwarp', [
          '-te', String(te[0]), String(te[1]), String(te[2]), String(te[3]),
          '-ts', String(refSize[0]), String(refSize[1]),
          '-r', 'bilinear',
          '-of', 'GTiff',
          '-co', 'COMPRESS=DEFLATE',
          '-overwrite',
          localPath,
          outPath,
        ], { timeout: 120_000 })
        aligned[key] = outPath
      }

      const fusionProducts: FusionProduct[] = []
      const outputPrefix = buildParcelPath(parcelId, 'fusion', '')

      // ─── Product 1: Beetle Stress Index ───
      // thermal_anomaly × (1 - NDRE) — high values = likely infestation
      if (aligned['thermal/anomaly'] && aligned['multispectral/ndre']) {
        const product = await this.computeProduct(
          tempDir,
          'beetle_stress',
          'Beetle Stress Index',
          [
            { flag: '-A', path: aligned['thermal/anomaly'] },
            { flag: '-B', path: aligned['multispectral/ndre'] },
          ],
          'maximum(A * (1.0 - B), 0)',
          ['thermal', 'multispectral'],
          `${outputPrefix}beetle_stress.tif`,
        )
        if (product) fusionProducts.push(product)
      }

      // ─── Product 2: Crown Health Index ───
      // NDVI × NDRE × inverse thermal anomaly — 0-1 scale
      if (aligned['multispectral/ndvi'] && aligned['multispectral/ndre']) {
        const inputs = [
          { flag: '-A', path: aligned['multispectral/ndvi'] },
          { flag: '-B', path: aligned['multispectral/ndre'] },
        ]
        let expr = 'clip((A+1)/2 * (B+1)/2, 0, 1)'

        if (aligned['thermal/anomaly']) {
          inputs.push({ flag: '-C', path: aligned['thermal/anomaly'] })
          // Penalize high thermal anomalies
          expr = 'clip((A+1)/2 * (B+1)/2 * clip(1 - C/4, 0.1, 1), 0, 1)'
        }

        const product = await this.computeProduct(
          tempDir,
          'crown_health',
          'Crown Health Index',
          inputs,
          expr,
          aligned['thermal/anomaly']
            ? ['multispectral', 'thermal']
            : ['multispectral'],
          `${outputPrefix}crown_health.tif`,
        )
        if (product) fusionProducts.push(product)
      }

      // ─── Product 3: Moisture Stress ───
      // NDVI-NDRE difference + thermal contribution
      if (aligned['multispectral/ndvi'] && aligned['multispectral/ndre']) {
        const inputs = [
          { flag: '-A', path: aligned['multispectral/ndvi'] },
          { flag: '-B', path: aligned['multispectral/ndre'] },
        ]
        let expr = 'clip(A - B, -1, 1)' // Moisture index = NDVI - NDRE

        if (aligned['thermal/anomaly']) {
          inputs.push({ flag: '-C', path: aligned['thermal/anomaly'] })
          expr = 'clip((A - B) + C * 0.3, -1, 2)' // Boost by thermal anomaly
        }

        const product = await this.computeProduct(
          tempDir,
          'moisture_stress',
          'Moisture Stress',
          inputs,
          expr,
          aligned['thermal/anomaly']
            ? ['multispectral', 'thermal']
            : ['multispectral'],
          `${outputPrefix}moisture_stress.tif`,
        )
        if (product) fusionProducts.push(product)
      }

      // ─── Product 4: Timber Value Proxy ───
      // CHM × NDVI — tall healthy trees = high value
      if (aligned['multispectral/ndvi']) {
        // Check for LiDAR CHM
        const { data: chmData } = await supabase
          .from('parcel_open_data')
          .select('storage_path')
          .eq('parcel_id', parcelId)
          .eq('source', 'lidar/chm')
          .maybeSingle()

        if (chmData?.storage_path) {
          const chmLocal = join(tempDir, 'chm_for_value.tif')
          await downloadToFile(chmData.storage_path, chmLocal)

          // Align CHM to reference grid
          const chmAligned = join(tempDir, 'chm_aligned_value.tif')
          await execFileAsync('gdalwarp', [
            '-te', String(te[0]), String(te[1]), String(te[2]), String(te[3]),
            '-ts', String(refSize[0]), String(refSize[1]),
            '-r', 'bilinear', '-overwrite',
            chmLocal, chmAligned,
          ], { timeout: 60_000 })

          const product = await this.computeProduct(
            tempDir,
            'timber_value',
            'Timber Value Proxy',
            [
              { flag: '-A', path: chmAligned },
              { flag: '-B', path: aligned['multispectral/ndvi'] },
            ],
            'maximum(A * clip((B + 1) / 2, 0, 1), 0)',
            ['lidar', 'multispectral'],
            `${outputPrefix}timber_value.tif`,
          )
          if (product) fusionProducts.push(product)
        }
      }

      // Store fusion products in database
      for (const fp of fusionProducts) {
        await supabase.from('fusion_products').upsert({
          survey_id: surveyId,
          parcel_id: parcelId,
          product_name: fp.name,
          storage_path: fp.storagePath,
          sensors_used: fp.sensorsUsed,
          metadata: { stats: fp.stats, label: fp.label },
        }, {
          onConflict: 'survey_id,product_name',
        })
      }

      this.log.info(
        { surveyId, productsCreated: fusionProducts.length, names: fusionProducts.map((p) => p.name) },
        'Pixel-level fusion complete',
      )

      return fusionProducts
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Compute a single derived product using gdal_calc.
   */
  private async computeProduct(
    tempDir: string,
    name: string,
    label: string,
    inputs: Array<{ flag: string; path: string }>,
    expression: string,
    sensorsUsed: string[],
    s3OutputPath: string,
  ): Promise<FusionProduct | null> {
    try {
      const rawPath = join(tempDir, `${name}_raw.tif`)
      const cogPath = join(tempDir, `${name}.tif`)

      const calcArgs: string[] = []
      for (const input of inputs) {
        calcArgs.push(input.flag, input.path)
      }
      calcArgs.push(
        '--outfile', rawPath,
        '--calc', expression,
        '--type', 'Float32',
        '--NoDataValue', '-9999',
        '--co', 'COMPRESS=DEFLATE',
      )

      await execFileAsync('gdal_calc.py', calcArgs, { timeout: 300_000 })

      // Convert to COG
      await execFileAsync('gdal_translate', [
        '-of', 'COG', '-co', 'COMPRESS=DEFLATE', rawPath, cogPath,
      ], { timeout: 120_000 })

      // Get stats
      const { stdout: statsJson } = await execFileAsync('gdalinfo', ['-json', '-stats', cogPath])
      const info = JSON.parse(statsJson)
      const bandStats = info.bands?.[0]?.computedStatistics ?? {}

      // Upload
      await uploadFromFile(cogPath, s3OutputPath, 'image/tiff')

      this.log.debug({ name, stats: bandStats }, `Fusion product computed: ${label}`)

      return {
        name,
        label,
        storagePath: s3OutputPath,
        sensorsUsed,
        stats: {
          min: bandStats.minimum ?? 0,
          max: bandStats.maximum ?? 0,
          mean: bandStats.mean ?? 0,
        },
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log.warn({ name, error: msg }, `Failed to compute fusion product: ${label}`)
      return null
    }
  }
}
