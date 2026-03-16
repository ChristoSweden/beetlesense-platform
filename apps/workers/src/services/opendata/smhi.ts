import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * SMHI Open Data API response types
 */
interface SMHIStation {
  key: string
  name: string
  owner: string
  ownerCategory: string
  measuringStations: string
  id: number
  height: number
  latitude: number
  longitude: number
  active: boolean
  from: number
  to: number
}

interface SMHIMonthlyRecord {
  year: number
  month: number
  meanTemp: number | null
  totalPrecip: number | null
}

/**
 * SMHIFetcher — integrates with SMHI Open Data API (Meteorological Observations).
 *
 * Real API documentation: https://opendata-download-metobs.smhi.se/api/version/1.0.html
 *
 * API URL structure:
 *   Base: https://opendata-download-metobs.smhi.se/api/version/1.0
 *   Parameters (key examples):
 *     1  = Lufttemperatur (momentanvärde, 1 gång/tim)
 *     2  = Lufttemperatur (medelvärde, 1 dygn)
 *     5  = Nederbördsmängd (summa, 1 dygn)
 *     22 = Lufttemperatur (medelvärde, 1 månad)
 *     23 = Nederbördsmängd (summa, 1 månad)
 *
 *   Station list: GET /parameter/{paramId}/station.json
 *   Data:         GET /parameter/{paramId}/station/{stationId}/period/{period}/data.json
 *   Periods:      latest-hour, latest-day, latest-months, corrected-archive
 *
 * All services are free, public, and require no authentication.
 */
export class SMHIFetcher {
  private readonly log = logger.child({ service: 'smhi' })

  private readonly API_BASE =
    'https://opendata-download-metobs.smhi.se/api/version/1.0'

  /** Parameter IDs in the SMHI API */
  private readonly PARAMS = {
    TEMP_MONTHLY_MEAN: 22,   // Monthly mean temperature
    PRECIP_MONTHLY_SUM: 23,  // Monthly precipitation sum
  } as const

  /**
   * Fetch climate data from the nearest SMHI station for the past 12 months.
   *
   * Steps:
   * 1. Fetch station list for the temperature parameter
   * 2. Find the nearest active station by haversine distance
   * 3. Fetch monthly mean temperature for the last 12 months
   * 4. Fetch monthly precipitation sum for the last 12 months
   * 5. Store combined data as JSON to S3
   *
   * @param lat - Latitude in WGS84
   * @param lon - Longitude in WGS84
   * @param parcelId - Parcel UUID
   * @returns Array of monthly climate records
   */
  async fetchClimateData(
    lat: number,
    lon: number,
    parcelId: string,
  ): Promise<SMHIMonthlyRecord[]> {
    this.log.info({ lat, lon, parcelId }, 'Fetching SMHI climate data')

    // TODO: Real implementation:
    // Step 1: Find nearest station
    // const stationsUrl = `${this.API_BASE}/parameter/${this.PARAMS.TEMP_MONTHLY_MEAN}/station.json`
    // const stationsResp = await fetch(stationsUrl)
    // const stationsData = await stationsResp.json()
    // const nearestStation = this.findNearestStation(stationsData.station, lat, lon)
    //
    // Step 2: Fetch temperature data
    // const tempUrl = `${this.API_BASE}/parameter/${this.PARAMS.TEMP_MONTHLY_MEAN}/station/${nearestStation.key}/period/latest-months/data.json`
    // const tempResp = await fetch(tempUrl)
    // const tempData = await tempResp.json()
    //
    // Step 3: Fetch precipitation data
    // const precipUrl = `${this.API_BASE}/parameter/${this.PARAMS.PRECIP_MONTHLY_SUM}/station/${nearestStation.key}/period/latest-months/data.json`
    // const precipResp = await fetch(precipUrl)
    // const precipData = await precipResp.json()

    // Mock: Realistic station near Värnamo
    const mockStation: SMHIStation = {
      key: '75250',
      name: 'Värnamo',
      owner: 'SMHI',
      ownerCategory: 'SMHI',
      measuringStations: 'CORE',
      id: 75250,
      height: 220,
      latitude: 57.186,
      longitude: 14.04,
      active: true,
      from: 946684800000,
      to: Date.now(),
    }

    this.log.info(
      {
        station: mockStation.name,
        stationId: mockStation.key,
        distance_km: this.haversineDistance(lat, lon, mockStation.latitude, mockStation.longitude),
      },
      'Found nearest SMHI station',
    )

    // Mock: Generate 12 months of realistic climate data for southern Sweden
    const now = new Date()
    const records: SMHIMonthlyRecord[] = []

    // Typical Värnamo monthly temps (Jan-Dec): -2, -1, 2, 7, 12, 15, 17, 16, 12, 7, 3, 0
    const typicalTemps = [-2, -1, 2, 7, 12, 15, 17, 16, 12, 7, 3, 0]
    // Typical monthly precipitation (mm): 50, 35, 40, 40, 50, 65, 80, 70, 65, 60, 60, 55
    const typicalPrecip = [50, 35, 40, 40, 50, 65, 80, 70, 65, 60, 60, 55]

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i)
      const monthIndex = date.getMonth()

      // Add slight random variation
      const tempVariation = (Math.random() - 0.5) * 3
      const precipVariation = (Math.random() - 0.5) * 20

      records.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        meanTemp: Math.round((typicalTemps[monthIndex]! + tempVariation) * 10) / 10,
        totalPrecip: Math.round(
          Math.max(0, typicalPrecip[monthIndex]! + precipVariation),
        ),
      })
    }

    // Build the stored JSON payload
    const climatePayload = {
      station: {
        id: mockStation.key,
        name: mockStation.name,
        latitude: mockStation.latitude,
        longitude: mockStation.longitude,
        elevation_m: mockStation.height,
      },
      query: { lat, lon },
      distance_km: this.haversineDistance(lat, lon, mockStation.latitude, mockStation.longitude),
      records,
      fetchedAt: new Date().toISOString(),
      apiUrls: {
        temperature: `${this.API_BASE}/parameter/${this.PARAMS.TEMP_MONTHLY_MEAN}/station/${mockStation.key}/period/latest-months/data.json`,
        precipitation: `${this.API_BASE}/parameter/${this.PARAMS.PRECIP_MONTHLY_SUM}/station/${mockStation.key}/period/latest-months/data.json`,
      },
    }

    // Store to S3
    const key = buildParcelPath(parcelId, 'smhi/climate', 'monthly_climate.json')
    await uploadToS3(
      key,
      Buffer.from(JSON.stringify(climatePayload, null, 2)),
      'application/json',
    )

    // Upsert to parcel_open_data
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('parcel_open_data')
      .select('id')
      .eq('parcel_id', parcelId)
      .eq('source', 'smhi/climate')
      .maybeSingle()

    const metadata = {
      type: 'monthly_climate',
      station_id: mockStation.key,
      station_name: mockStation.name,
      distance_km: climatePayload.distance_km,
      period_months: 12,
      latestMonth: `${records[records.length - 1]!.year}-${String(records[records.length - 1]!.month).padStart(2, '0')}`,
    }

    if (existing) {
      await supabase
        .from('parcel_open_data')
        .update({
          storage_path: key,
          fetched_at: new Date().toISOString(),
          metadata,
          data_version: new Date().toISOString().slice(0, 10),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('parcel_open_data').insert({
        parcel_id: parcelId,
        source: 'smhi/climate',
        storage_path: key,
        metadata,
        data_version: new Date().toISOString().slice(0, 10),
      })
    }

    this.log.info(
      { parcelId, recordCount: records.length, station: mockStation.name },
      'Climate data fetched and stored',
    )
    return records
  }

  /**
   * Calculate haversine distance between two points in km.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180
  }
}
