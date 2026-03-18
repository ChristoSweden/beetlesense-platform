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

interface SMHIStationListResponse {
  station: SMHIStation[]
}

interface SMHIValue {
  date: number
  value: string
  quality: string
}

interface SMHIDataResponse {
  value: SMHIValue[]
  station: {
    key: string
    name: string
    height: number
  }
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
 * API docs: https://opendata-download-metobs.smhi.se/api/version/1.0.html
 *
 * Parameters used:
 *   22 = Lufttemperatur (medelvärde, 1 månad)
 *   23 = Nederbördsmängd (summa, 1 månad)
 *
 * All services are free, public, and require no authentication.
 */
export class SMHIFetcher {
  private readonly log = logger.child({ service: 'smhi' })

  private readonly API_BASE =
    'https://opendata-download-metobs.smhi.se/api/version/1.0'

  private readonly PARAMS = {
    TEMP_MONTHLY_MEAN: 22,
    PRECIP_MONTHLY_SUM: 23,
  } as const

  /**
   * Fetch climate data from the nearest SMHI station for the past 12 months.
   *
   * 1. Fetch station list for temperature parameter
   * 2. Find nearest active station by haversine distance
   * 3. Fetch monthly mean temperature
   * 4. Fetch monthly precipitation sum
   * 5. Merge and store results
   */
  async fetchClimateData(
    lat: number,
    lon: number,
    parcelId: string,
  ): Promise<SMHIMonthlyRecord[]> {
    this.log.info({ lat, lon, parcelId }, 'Fetching SMHI climate data')

    // Step 1: Find nearest station
    const nearestStation = await this.findNearestStation(lat, lon)
    const distance = this.haversineDistance(lat, lon, nearestStation.latitude, nearestStation.longitude)

    this.log.info(
      {
        station: nearestStation.name,
        stationId: nearestStation.key,
        distance_km: distance,
      },
      'Found nearest SMHI station',
    )

    // Step 2: Fetch temperature and precipitation data in parallel
    const [tempRecords, precipRecords] = await Promise.all([
      this.fetchParameterData(this.PARAMS.TEMP_MONTHLY_MEAN, nearestStation.key),
      this.fetchParameterData(this.PARAMS.PRECIP_MONTHLY_SUM, nearestStation.key),
    ])

    // Step 3: Merge into monthly records (last 12 months)
    const records = this.mergeMonthlyRecords(tempRecords, precipRecords)

    this.log.info(
      { recordCount: records.length, station: nearestStation.name },
      'Climate data fetched from SMHI',
    )

    // Step 4: Store to S3 + Supabase
    const climatePayload = {
      station: {
        id: nearestStation.key,
        name: nearestStation.name,
        latitude: nearestStation.latitude,
        longitude: nearestStation.longitude,
        elevation_m: nearestStation.height,
      },
      query: { lat, lon },
      distance_km: distance,
      records,
      fetchedAt: new Date().toISOString(),
      source: 'smhi-opendata-live',
    }

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
      station_id: nearestStation.key,
      station_name: nearestStation.name,
      distance_km: distance,
      period_months: records.length,
      latestMonth: records.length > 0
        ? `${records[records.length - 1]!.year}-${String(records[records.length - 1]!.month).padStart(2, '0')}`
        : null,
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
      { parcelId, recordCount: records.length, station: nearestStation.name },
      'Climate data stored',
    )
    return records
  }

  /**
   * Fetch the station list and find the nearest active station.
   */
  private async findNearestStation(lat: number, lon: number): Promise<SMHIStation> {
    const url = `${this.API_BASE}/parameter/${this.PARAMS.TEMP_MONTHLY_MEAN}/station.json`

    this.log.debug({ url }, 'Fetching SMHI station list')
    const resp = await fetch(url)
    if (!resp.ok) {
      throw new Error(`SMHI station list failed: ${resp.status} ${resp.statusText}`)
    }

    const data = (await resp.json()) as SMHIStationListResponse
    const activeStations = data.station.filter((s) => s.active)

    if (activeStations.length === 0) {
      throw new Error('No active SMHI stations found')
    }

    // Find nearest by haversine distance
    let nearest = activeStations[0]!
    let minDist = this.haversineDistance(lat, lon, nearest.latitude, nearest.longitude)

    for (const station of activeStations) {
      const dist = this.haversineDistance(lat, lon, station.latitude, station.longitude)
      if (dist < minDist) {
        minDist = dist
        nearest = station
      }
    }

    return nearest
  }

  /**
   * Fetch monthly data for a given parameter and station.
   * Returns array of { date (epoch ms), value (number) }.
   */
  private async fetchParameterData(
    paramId: number,
    stationKey: string,
  ): Promise<Array<{ date: number; value: number }>> {
    const url = `${this.API_BASE}/parameter/${paramId}/station/${stationKey}/period/latest-months/data.json`

    this.log.debug({ url, paramId, stationKey }, 'Fetching SMHI parameter data')
    const resp = await fetch(url)
    if (!resp.ok) {
      this.log.warn(
        { paramId, stationKey, status: resp.status },
        'SMHI parameter fetch failed, returning empty',
      )
      return []
    }

    const data = (await resp.json()) as SMHIDataResponse

    return data.value
      .filter((v) => v.quality === 'G' || v.quality === 'Y') // G=controlled, Y=preliminary
      .map((v) => ({
        date: v.date,
        value: parseFloat(v.value),
      }))
      .filter((v) => !isNaN(v.value))
  }

  /**
   * Merge temperature and precipitation records into monthly summaries.
   * Only keeps the last 12 months.
   */
  private mergeMonthlyRecords(
    tempRecords: Array<{ date: number; value: number }>,
    precipRecords: Array<{ date: number; value: number }>,
  ): SMHIMonthlyRecord[] {
    // Index precipitation by year-month
    const precipMap = new Map<string, number>()
    for (const rec of precipRecords) {
      const d = new Date(rec.date)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      precipMap.set(key, rec.value)
    }

    // Build merged records from temperature
    const merged: SMHIMonthlyRecord[] = tempRecords.map((rec) => {
      const d = new Date(rec.date)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const key = `${year}-${month}`

      return {
        year,
        month,
        meanTemp: Math.round(rec.value * 10) / 10,
        totalPrecip: precipMap.has(key)
          ? Math.round(precipMap.get(key)! * 10) / 10
          : null,
      }
    })

    // Sort by date and take last 12
    merged.sort((a, b) => {
      const da = a.year * 12 + a.month
      const db = b.year * 12 + b.month
      return da - db
    })

    return merged.slice(-12)
  }

  /**
   * Haversine distance between two points in km.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371
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
