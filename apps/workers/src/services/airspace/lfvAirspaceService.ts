import { logger } from '../../lib/logger.js'

// ─── Types ───

export interface AirspaceRestriction {
  id: string
  type: 'CTR' | 'ATZ' | 'R' | 'P' | 'D' | 'NATURE_RESERVE' | 'NOTAM' | 'TRA' | 'TSA'
  name: string
  nameEn?: string
  description: string
  maxAltitudeM: number | null
  geometry: GeoJSON.Polygon | GeoJSON.Polygon
  active: boolean
  validFrom: string | null
  validUntil: string | null
  source: 'lfv' | 'droneinfo' | 'notam' | 'naturvardsverket'
  requiresPermit: boolean
  permitAuthority?: string // e.g. 'LFV', 'Transportstyrelsen', 'Länsstyrelsen'
}

export interface AirspaceCheckResult {
  allowed: boolean
  restrictions: AirspaceRestriction[]
  warnings: string[]
  maxAltitudeM: number
  requiresPermit: boolean
  permitAuthorities: string[]
  checkedAt: string
  coordinate: { lat: number; lng: number }
}

export interface FlightPlanCheckResult {
  allowed: boolean
  waypointResults: Array<{
    index: number
    lat: number
    lng: number
    altitudeM: number
    allowed: boolean
    restrictions: AirspaceRestriction[]
  }>
  overallRestrictions: AirspaceRestriction[]
  warnings: string[]
  requiresPermit: boolean
}

interface DroneinfoResponse {
  allowed: boolean
  max_altitude_m: number
  zones: Array<{
    id: string
    type: string
    name: string
    description: string
    geometry: unknown
    max_altitude_m: number | null
    requires_permit: boolean
  }>
  notams: Array<{
    id: string
    title: string
    description: string
    effective_from: string
    effective_until: string
    geometry: unknown
  }>
}

interface LfvRestrictionZone {
  identifier: string
  type: string
  name: string
  upper_limit_m: number | null
  lower_limit_m: number
  geometry: unknown
  active: boolean
}

// ─── Configuration ───

const LFV_API_BASE = 'https://api.lfv.se/airspace/v1'
const DRONEINFO_API_BASE = 'https://www.droneinfo.se/api'
const NOTAM_API_BASE = 'https://api.lfv.se/notam/v1'

/** Default max altitude for unrestricted airspace (Swedish open category) */
const DEFAULT_MAX_ALTITUDE_M = 120

/** Swedish zone type labels */
const ZONE_TYPE_LABELS: Record<string, string> = {
  CTR: 'Kontrollzon (CTR)',
  ATZ: 'Flygplatstrafikzon (ATZ)',
  R: 'Restriktionsområde (R)',
  P: 'Förbjudet område (P)',
  D: 'Fareområde (D)',
  NATURE_RESERVE: 'Naturreservat',
  NOTAM: 'Tillfällig restriktion (NOTAM)',
  TRA: 'Tillfälligt reserverat område (TRA)',
  TSA: 'Tillfälligt segregerat område (TSA)',
}

/**
 * LfvAirspaceService — Swedish airspace compliance checking.
 *
 * Integrates with:
 * - LFV (Luftfartsverket) API for controlled airspace zones
 * - Drönarkollen (droneinfo.se) API for drone-specific restrictions
 * - NOTAM service for temporary flight restrictions
 * - Naturvårdsverket data for nature reserves
 *
 * All coordinates in WGS84 (EPSG:4326).
 */
export class LfvAirspaceService {
  private readonly log = logger.child({ service: 'lfv-airspace' })
  private readonly lfvApiKey: string | undefined
  private readonly droneinfoApiKey: string | undefined

  constructor() {
    this.lfvApiKey = process.env.LFV_API_KEY
    this.droneinfoApiKey = process.env.DRONEINFO_API_KEY

    if (!this.lfvApiKey) {
      this.log.warn('LFV_API_KEY not set — airspace checks will use cached/demo data')
    }
    if (!this.droneinfoApiKey) {
      this.log.warn('DRONEINFO_API_KEY not set — Drönarkollen checks will use cached/demo data')
    }
  }

  // ─── Public API ───

  /**
   * Check airspace restrictions at a specific coordinate.
   *
   * @param lat Latitude (WGS84)
   * @param lng Longitude (WGS84)
   * @param altitudeM Planned flight altitude AGL in meters
   * @param radiusM Search radius in meters (default: 500m)
   */
  async checkAirspace(
    lat: number,
    lng: number,
    altitudeM: number = 120,
    radiusM: number = 500,
  ): Promise<AirspaceCheckResult> {
    this.log.info({ lat, lng, altitudeM, radiusM }, 'Checking airspace')

    const restrictions: AirspaceRestriction[] = []
    const warnings: string[] = []

    // Run checks in parallel
    const [lfvZones, droneinfoResult, notams, natureReserves] = await Promise.allSettled([
      this.queryLfvZones(lat, lng, radiusM),
      this.queryDroneinfo(lat, lng),
      this.queryNotams(lat, lng, radiusM),
      this.queryNatureReserves(lat, lng, radiusM),
    ])

    // Process LFV restricted zones
    if (lfvZones.status === 'fulfilled') {
      restrictions.push(...lfvZones.value)
    } else {
      this.log.error({ err: lfvZones.reason }, 'LFV zone query failed')
      warnings.push('Kunde inte kontrollera LFV luftrumsdata — kontrollera manuellt')
    }

    // Process Drönarkollen result
    if (droneinfoResult.status === 'fulfilled') {
      restrictions.push(...droneinfoResult.value)
    } else {
      this.log.error({ err: droneinfoResult.reason }, 'Droneinfo query failed')
      warnings.push('Kunde inte kontrollera Drönarkollen — kontrollera manuellt på droneinfo.se')
    }

    // Process NOTAMs
    if (notams.status === 'fulfilled') {
      restrictions.push(...notams.value)
    } else {
      this.log.error({ err: notams.reason }, 'NOTAM query failed')
      warnings.push('Kunde inte kontrollera NOTAM — kontrollera manuellt')
    }

    // Process nature reserves
    if (natureReserves.status === 'fulfilled') {
      restrictions.push(...natureReserves.value)
    } else {
      this.log.error({ err: natureReserves.reason }, 'Nature reserve query failed')
      warnings.push('Kunde inte kontrollera naturreservat — kontrollera med Länsstyrelsen')
    }

    // Determine overall max altitude
    const activeRestrictions = restrictions.filter(r => r.active)
    const altitudeLimits = activeRestrictions
      .map(r => r.maxAltitudeM)
      .filter((a): a is number => a !== null)

    const maxAltitudeM = altitudeLimits.length > 0
      ? Math.min(...altitudeLimits)
      : DEFAULT_MAX_ALTITUDE_M

    // Check if altitude exceeds limit
    if (altitudeM > maxAltitudeM) {
      warnings.push(
        `Planerad höjd ${altitudeM}m överstiger maxhöjden ${maxAltitudeM}m i detta område`
      )
    }

    // Determine if any restriction prohibits flight
    const prohibitedZones = activeRestrictions.filter(
      r => r.type === 'P' || (r.type === 'R' && r.maxAltitudeM === 0)
    )
    const requiresPermit = activeRestrictions.some(r => r.requiresPermit)
    const permitAuthorities = [
      ...new Set(activeRestrictions.filter(r => r.requiresPermit && r.permitAuthority).map(r => r.permitAuthority!))
    ]

    const allowed = prohibitedZones.length === 0 && altitudeM <= maxAltitudeM

    return {
      allowed,
      restrictions: activeRestrictions,
      warnings,
      maxAltitudeM,
      requiresPermit,
      permitAuthorities,
      checkedAt: new Date().toISOString(),
      coordinate: { lat, lng },
    }
  }

  /**
   * Check airspace for an entire flight plan (multiple waypoints).
   */
  async checkFlightPlan(
    waypoints: Array<{ lat: number; lng: number; altitudeM: number }>,
  ): Promise<FlightPlanCheckResult> {
    this.log.info({ waypointCount: waypoints.length }, 'Checking flight plan airspace')

    const waypointResults = await Promise.all(
      waypoints.map(async (wp, index) => {
        const result = await this.checkAirspace(wp.lat, wp.lng, wp.altitudeM, 100)
        return {
          index,
          lat: wp.lat,
          lng: wp.lng,
          altitudeM: wp.altitudeM,
          allowed: result.allowed,
          restrictions: result.restrictions,
        }
      }),
    )

    // Collect unique restrictions across all waypoints
    const seenIds = new Set<string>()
    const overallRestrictions: AirspaceRestriction[] = []
    for (const wp of waypointResults) {
      for (const r of wp.restrictions) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id)
          overallRestrictions.push(r)
        }
      }
    }

    const allowed = waypointResults.every(wp => wp.allowed)
    const requiresPermit = overallRestrictions.some(r => r.requiresPermit)

    const warnings: string[] = []
    const blockedWaypoints = waypointResults.filter(wp => !wp.allowed)
    if (blockedWaypoints.length > 0) {
      warnings.push(
        `${blockedWaypoints.length} av ${waypoints.length} waypoints befinner sig i restriktionsområde`
      )
    }

    return {
      allowed,
      waypointResults,
      overallRestrictions,
      warnings,
      requiresPermit,
    }
  }

  /**
   * Get all restrictions near a coordinate within a given radius.
   */
  async getNearbyRestrictions(
    lat: number,
    lng: number,
    radiusKm: number = 10,
  ): Promise<AirspaceRestriction[]> {
    this.log.info({ lat, lng, radiusKm }, 'Getting nearby restrictions')

    const radiusM = radiusKm * 1000
    const [lfvZones, notams, natureReserves] = await Promise.allSettled([
      this.queryLfvZones(lat, lng, radiusM),
      this.queryNotams(lat, lng, radiusM),
      this.queryNatureReserves(lat, lng, radiusM),
    ])

    const restrictions: AirspaceRestriction[] = []

    if (lfvZones.status === 'fulfilled') restrictions.push(...lfvZones.value)
    if (notams.status === 'fulfilled') restrictions.push(...notams.value)
    if (natureReserves.status === 'fulfilled') restrictions.push(...natureReserves.value)

    return restrictions
  }

  /**
   * Get Swedish label for a zone type.
   */
  getZoneTypeLabel(type: string): string {
    return ZONE_TYPE_LABELS[type] ?? type
  }

  // ─── Private: LFV API ───

  private async queryLfvZones(lat: number, lng: number, radiusM: number): Promise<AirspaceRestriction[]> {
    if (!this.lfvApiKey) {
      return this.getLfvDemoZones(lat, lng, radiusM)
    }

    try {
      const response = await fetch(
        `${LFV_API_BASE}/zones?lat=${lat}&lng=${lng}&radius=${radiusM}`,
        {
          headers: {
            Authorization: `Bearer ${this.lfvApiKey}`,
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`LFV API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as { zones: LfvRestrictionZone[] }

      return data.zones.map((zone): AirspaceRestriction => ({
        id: `lfv-${zone.identifier}`,
        type: this.mapLfvZoneType(zone.type),
        name: zone.name,
        description: `${ZONE_TYPE_LABELS[this.mapLfvZoneType(zone.type)] ?? zone.type}: ${zone.name}`,
        maxAltitudeM: zone.upper_limit_m,
        geometry: zone.geometry as GeoJSON.Polygon,
        active: zone.active,
        validFrom: null,
        validUntil: null,
        source: 'lfv',
        requiresPermit: ['CTR', 'ATZ', 'R', 'P'].includes(this.mapLfvZoneType(zone.type)),
        permitAuthority: this.getPermitAuthority(this.mapLfvZoneType(zone.type)),
      }))
    } catch (err) {
      this.log.error({ err }, 'LFV API request failed')
      throw err
    }
  }

  // ─── Private: Drönarkollen (droneinfo.se) ───

  private async queryDroneinfo(lat: number, lng: number): Promise<AirspaceRestriction[]> {
    if (!this.droneinfoApiKey) {
      return this.getDroneinfoDemoZones(lat, lng)
    }

    try {
      const response = await fetch(
        `${DRONEINFO_API_BASE}/check?lat=${lat}&lng=${lng}`,
        {
          headers: {
            'X-Api-Key': this.droneinfoApiKey,
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Droneinfo API error: ${response.status}`)
      }

      const data = (await response.json()) as DroneinfoResponse

      return data.zones.map((zone): AirspaceRestriction => ({
        id: `droneinfo-${zone.id}`,
        type: this.mapDroneinfoZoneType(zone.type),
        name: zone.name,
        description: zone.description,
        maxAltitudeM: zone.max_altitude_m,
        geometry: zone.geometry as GeoJSON.Polygon,
        active: true,
        validFrom: null,
        validUntil: null,
        source: 'droneinfo',
        requiresPermit: zone.requires_permit,
        permitAuthority: zone.requires_permit ? 'LFV' : undefined,
      }))
    } catch (err) {
      this.log.error({ err }, 'Droneinfo API request failed')
      throw err
    }
  }

  // ─── Private: NOTAMs ───

  private async queryNotams(lat: number, lng: number, radiusM: number): Promise<AirspaceRestriction[]> {
    if (!this.lfvApiKey) {
      return this.getNotamDemoData(lat, lng)
    }

    try {
      const radiusNm = radiusM / 1852 // Convert meters to nautical miles
      const response = await fetch(
        `${NOTAM_API_BASE}/search?lat=${lat}&lng=${lng}&radius=${radiusNm}`,
        {
          headers: {
            Authorization: `Bearer ${this.lfvApiKey}`,
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`NOTAM API error: ${response.status}`)
      }

      const data = (await response.json()) as DroneinfoResponse

      return (data.notams ?? []).map((notam): AirspaceRestriction => ({
        id: `notam-${notam.id}`,
        type: 'NOTAM',
        name: notam.title,
        description: notam.description,
        maxAltitudeM: null,
        geometry: notam.geometry as GeoJSON.Polygon,
        active: true,
        validFrom: notam.effective_from,
        validUntil: notam.effective_until,
        source: 'notam',
        requiresPermit: true,
        permitAuthority: 'LFV',
      }))
    } catch (err) {
      this.log.error({ err }, 'NOTAM query failed')
      throw err
    }
  }

  // ─── Private: Nature Reserves ───

  private async queryNatureReserves(lat: number, lng: number, radiusM: number): Promise<AirspaceRestriction[]> {
    // Naturvårdsverket WFS service for nature reserves
    const wfsUrl = 'https://geodata.naturvardsverket.se/geoserver/skydd/wfs'
    const bbox = this.getBoundingBox(lat, lng, radiusM)

    try {
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: 'skydd:NR_polygon',
        outputFormat: 'application/json',
        srsName: 'EPSG:4326',
        bbox: `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng},EPSG:4326`,
      })

      const response = await fetch(`${wfsUrl}?${params}`)

      if (!response.ok) {
        throw new Error(`Naturvårdsverket WFS error: ${response.status}`)
      }

      const data = (await response.json()) as GeoJSON.FeatureCollection

      return (data.features ?? []).map((feature): AirspaceRestriction => {
        const props = feature.properties ?? {}
        return {
          id: `nr-${props.NVRID ?? props.OBJECTID ?? Math.random().toString(36).slice(2)}`,
          type: 'NATURE_RESERVE',
          name: props.NAMN ?? 'Okänt naturreservat',
          nameEn: props.NAMN_ENG,
          description: `Naturreservat: ${props.NAMN ?? 'Okänt'}. Drönare kan kräva tillstånd från Länsstyrelsen.`,
          maxAltitudeM: DEFAULT_MAX_ALTITUDE_M, // Standard altitude unless further restricted
          geometry: feature.geometry as GeoJSON.Polygon,
          active: true,
          validFrom: null,
          validUntil: null,
          source: 'naturvardsverket',
          requiresPermit: true,
          permitAuthority: 'Länsstyrelsen',
        }
      })
    } catch (err) {
      this.log.error({ err }, 'Nature reserve query failed')
      throw err
    }
  }

  // ─── Private: Helpers ───

  private mapLfvZoneType(type: string): AirspaceRestriction['type'] {
    const mapping: Record<string, AirspaceRestriction['type']> = {
      CTR: 'CTR',
      ATZ: 'ATZ',
      'R-AREA': 'R',
      'P-AREA': 'P',
      'D-AREA': 'D',
      TRA: 'TRA',
      TSA: 'TSA',
    }
    return mapping[type.toUpperCase()] ?? 'R'
  }

  private mapDroneinfoZoneType(type: string): AirspaceRestriction['type'] {
    const mapping: Record<string, AirspaceRestriction['type']> = {
      ctr: 'CTR',
      atz: 'ATZ',
      restricted: 'R',
      prohibited: 'P',
      danger: 'D',
      nature_reserve: 'NATURE_RESERVE',
      notam: 'NOTAM',
    }
    return mapping[type.toLowerCase()] ?? 'R'
  }

  private getPermitAuthority(type: AirspaceRestriction['type']): string | undefined {
    const authorities: Record<string, string> = {
      CTR: 'LFV',
      ATZ: 'LFV',
      R: 'LFV / Försvarsmakten',
      P: 'LFV',
      D: 'LFV',
      NATURE_RESERVE: 'Länsstyrelsen',
    }
    return authorities[type]
  }

  private getBoundingBox(lat: number, lng: number, radiusM: number) {
    const latDelta = radiusM / 111320
    const lngDelta = radiusM / (111320 * Math.cos((lat * Math.PI) / 180))
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    }
  }

  // ─── Demo Data ───
  // Realistic Swedish airspace restrictions for development/demo use.

  private getLfvDemoZones(lat: number, lng: number, radiusM: number): AirspaceRestriction[] {
    const zones: AirspaceRestriction[] = [
      {
        id: 'lfv-ctr-vaxjo',
        type: 'CTR',
        name: 'Växjö CTR',
        description: 'Kontrollzon (CTR): Växjö Kronoberg flygplats. Drönare kräver tillstånd från LFV.',
        maxAltitudeM: 0,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [14.68, 56.95], [14.78, 56.95], [14.78, 56.87],
            [14.68, 56.87], [14.68, 56.95],
          ]],
        },
        active: true,
        validFrom: null,
        validUntil: null,
        source: 'lfv',
        requiresPermit: true,
        permitAuthority: 'LFV',
      },
      {
        id: 'lfv-atz-jonkoping',
        type: 'ATZ',
        name: 'Jönköping ATZ',
        description: 'Flygplatstrafikzon (ATZ): Jönköping flygplats. Drönare kräver samordning.',
        maxAltitudeM: 50,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [14.03, 57.77], [14.13, 57.77], [14.13, 57.73],
            [14.03, 57.73], [14.03, 57.77],
          ]],
        },
        active: true,
        validFrom: null,
        validUntil: null,
        source: 'lfv',
        requiresPermit: true,
        permitAuthority: 'LFV',
      },
      {
        id: 'lfv-r-karlsborg',
        type: 'R',
        name: 'R81 Karlsborg',
        description: 'Restriktionsområde (R): Karlsborg militärt övningsområde. Flygning förbjuden utan tillstånd.',
        maxAltitudeM: 0,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [14.45, 58.56], [14.58, 58.56], [14.58, 58.50],
            [14.45, 58.50], [14.45, 58.56],
          ]],
        },
        active: true,
        validFrom: null,
        validUntil: null,
        source: 'lfv',
        requiresPermit: true,
        permitAuthority: 'LFV / Försvarsmakten',
      },
      {
        id: 'lfv-p-stockholm',
        type: 'P',
        name: 'P2 Stockholm Slott',
        description: 'Förbjudet område (P): Stockholms slott och riksdagen. Flygning helt förbjuden.',
        maxAltitudeM: 0,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [18.06, 59.33], [18.08, 59.33], [18.08, 59.32],
            [18.06, 59.32], [18.06, 59.33],
          ]],
        },
        active: true,
        validFrom: null,
        validUntil: null,
        source: 'lfv',
        requiresPermit: true,
        permitAuthority: 'LFV',
      },
    ]

    // Filter by distance
    return zones.filter(z => this.isWithinRadius(lat, lng, z, radiusM))
  }

  private getDroneinfoDemoZones(lat: number, lng: number): AirspaceRestriction[] {
    // Drönarkollen typically returns data around the queried point
    const zones: AirspaceRestriction[] = [
      {
        id: 'droneinfo-d-ostersjoen',
        type: 'D',
        name: 'D3 Norrköping',
        description: 'Fareområde (D): Militärt övningsområde. Försiktighet vid flygning.',
        maxAltitudeM: 80,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [16.50, 58.65], [16.65, 58.65], [16.65, 58.58],
            [16.50, 58.58], [16.50, 58.65],
          ]],
        },
        active: true,
        validFrom: null,
        validUntil: null,
        source: 'droneinfo',
        requiresPermit: false,
      },
    ]

    return zones.filter(z => this.isWithinRadius(lat, lng, z, 50_000))
  }

  private getNotamDemoData(lat: number, lng: number): AirspaceRestriction[] {
    const notams: AirspaceRestriction[] = [
      {
        id: 'notam-2026-0342',
        type: 'NOTAM',
        name: 'NOTAM A0342/26 — Militärövning Småland',
        description: 'Tillfällig restriktion pga militärövning. GND-300m. Kontakta Försvarsmakten.',
        maxAltitudeM: 0,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [15.20, 57.20], [15.35, 57.20], [15.35, 57.10],
            [15.20, 57.10], [15.20, 57.20],
          ]],
        },
        active: true,
        validFrom: '2026-03-18T06:00:00Z',
        validUntil: '2026-03-20T18:00:00Z',
        source: 'notam',
        requiresPermit: true,
        permitAuthority: 'LFV',
      },
    ]

    return notams.filter(n => this.isWithinRadius(lat, lng, n, 50_000))
  }

  private isWithinRadius(lat: number, lng: number, restriction: AirspaceRestriction, radiusM: number): boolean {
    // Simple bounding-box centroid distance check for demo
    const geom = restriction.geometry
    if (geom.type === 'Polygon' && geom.coordinates?.[0]) {
      const coords = geom.coordinates[0]
      const centroidLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length
      const centroidLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length
      const dist = this.haversineM(lat, lng, centroidLat, centroidLng)
      return dist <= radiusM
    }
    return false
  }

  private haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
