import { logger } from '../../lib/logger.js'
import type { DjiWaypointMission } from './cloudApiClient.js'

/**
 * Flight plan generation parameters.
 */
export interface FlightPlanParams {
  /** Parcel boundary as GeoJSON polygon coordinates [lng, lat][] */
  boundary: number[][]
  /** Sensor types to capture */
  sensors: Array<'rgb' | 'multispectral' | 'thermal' | 'lidar'>
  /** Flight altitude AGL in meters (default: 80m for forestry) */
  altitudeM?: number
  /** Front overlap percentage (default: 80%) */
  overlapFront?: number
  /** Side overlap percentage (default: 70%) */
  overlapSide?: number
  /** Ground speed in m/s (default: 5 m/s) */
  speedMs?: number
  /** Takeoff/landing point [lng, lat] — defaults to nearest boundary corner */
  homePoint?: [number, number]
  /** Mission name */
  name?: string
}

interface Waypoint {
  latitude: number
  longitude: number
  height: number
  speed: number
  heading: number
  gimbal_pitch: number
  actions: Array<{ action_type: 'take_photo' | 'start_record' | 'stop_record'; params?: Record<string, unknown> }>
}

/**
 * MissionPlanner — generates optimized DJI waypoint missions for forest survey parcels.
 *
 * Flight pattern: Lawnmower (boustrophedon) — optimal for orthomosaic coverage.
 * Automatically computes:
 * - Ground Sample Distance (GSD) from altitude + sensor
 * - Line spacing from overlap + GSD
 * - Photo interval from overlap + speed
 * - Flight duration estimate
 * - Battery requirement check
 */
export class MissionPlanner {
  private readonly log = logger.child({ service: 'dji-mission-planner' })

  /** Sensor configurations — GSD and FOV at reference altitude */
  private readonly SENSOR_CONFIG: Record<string, { fovDeg: number; sensorWidthMm: number; focalLengthMm: number; imageWidthPx: number; imageHeightPx: number }> = {
    rgb: { fovDeg: 84, sensorWidthMm: 17.3, focalLengthMm: 12.3, imageWidthPx: 5280, imageHeightPx: 3956 },
    multispectral: { fovDeg: 62, sensorWidthMm: 8.8, focalLengthMm: 5.74, imageWidthPx: 1600, imageHeightPx: 1300 },
    thermal: { fovDeg: 61, sensorWidthMm: 7.68, focalLengthMm: 6.89, imageWidthPx: 640, imageHeightPx: 512 },
    lidar: { fovDeg: 70, sensorWidthMm: 0, focalLengthMm: 0, imageWidthPx: 0, imageHeightPx: 0 },
  }

  /**
   * Generate a complete waypoint mission for a forest parcel.
   */
  generateMission(params: FlightPlanParams): {
    mission: DjiWaypointMission
    stats: {
      estimatedDurationMin: number
      estimatedPhotos: number
      coverageAreaHa: number
      flightDistanceM: number
      lineSpacingM: number
      photoIntervalM: number
      gsdCm: number
      batteryRequired: number
    }
  } {
    const altitude = params.altitudeM ?? 80
    const overlapFront = (params.overlapFront ?? 80) / 100
    const overlapSide = (params.overlapSide ?? 70) / 100
    const speed = params.speedMs ?? 5
    const boundary = params.boundary
    const name = params.name ?? 'BeetleSense Survey'

    this.log.info(
      { altitude, overlapFront, overlapSide, speed, sensors: params.sensors, boundaryPoints: boundary.length },
      'Generating flight plan',
    )

    // Pick the primary sensor (determines GSD and line spacing)
    const primarySensor = params.sensors.includes('multispectral') ? 'multispectral' : 'rgb'
    const sensorConfig = this.SENSOR_CONFIG[primarySensor]

    // Compute Ground Sample Distance (GSD)
    const gsdM = (altitude * sensorConfig.sensorWidthMm) / (sensorConfig.focalLengthMm * sensorConfig.imageWidthPx) / 1000
    const gsdCm = gsdM * 100

    // Compute ground footprint
    const footprintWidthM = gsdM * sensorConfig.imageWidthPx
    const footprintHeightM = gsdM * sensorConfig.imageHeightPx

    // Line spacing and photo interval from overlap
    const lineSpacingM = footprintWidthM * (1 - overlapSide)
    const photoIntervalM = footprintHeightM * (1 - overlapFront)

    // Compute bounding box of parcel
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
    for (const [lng, lat] of boundary) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }

    // Convert bbox to meters (approximate at Swedish latitudes ~57°N)
    const latToM = 111320
    const lngToM = 111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180)
    const widthM = (maxLng - minLng) * lngToM
    const heightM = (maxLat - minLat) * latToM

    // Determine flight direction (fly along longest axis)
    const flyAlongWidth = widthM > heightM
    const flightLengthM = flyAlongWidth ? heightM : widthM
    const lineCount = Math.ceil((flyAlongWidth ? widthM : heightM) / lineSpacingM) + 1

    // Generate lawnmower waypoints
    const waypoints: Waypoint[] = []
    const homePoint = params.homePoint ?? [boundary[0][0], boundary[0][1]]

    // Takeoff waypoint
    waypoints.push({
      latitude: homePoint[1],
      longitude: homePoint[0],
      height: altitude,
      speed,
      heading: flyAlongWidth ? 0 : 90,
      gimbal_pitch: -90,
      actions: [{ action_type: 'take_photo' }],
    })

    for (let i = 0; i < lineCount; i++) {
      const isForward = i % 2 === 0
      const lineOffset = i * lineSpacingM

      // Start and end of this line
      let startLng: number, startLat: number, endLng: number, endLat: number

      if (flyAlongWidth) {
        const lng = minLng + lineOffset / lngToM
        startLat = isForward ? minLat : maxLat
        endLat = isForward ? maxLat : minLat
        startLng = lng
        endLng = lng
      } else {
        const lat = minLat + lineOffset / latToM
        startLng = isForward ? minLng : maxLng
        endLng = isForward ? maxLng : minLng
        startLat = lat
        endLat = lat
      }

      // Add waypoints along the line at photo intervals
      const photosPerLine = Math.ceil(flightLengthM / photoIntervalM) + 1
      for (let p = 0; p < photosPerLine; p++) {
        const t = p / Math.max(1, photosPerLine - 1)
        waypoints.push({
          latitude: startLat + (endLat - startLat) * t,
          longitude: startLng + (endLng - startLng) * t,
          height: altitude,
          speed,
          heading: flyAlongWidth ? (isForward ? 0 : 180) : (isForward ? 90 : 270),
          gimbal_pitch: -90,
          actions: [{ action_type: 'take_photo' }],
        })
      }
    }

    // Return to home
    waypoints.push({
      latitude: homePoint[1],
      longitude: homePoint[0],
      height: altitude,
      speed,
      heading: 0,
      gimbal_pitch: 0,
      actions: [],
    })

    // Compute statistics
    let totalDistance = 0
    for (let i = 1; i < waypoints.length; i++) {
      const dLat = (waypoints[i].latitude - waypoints[i - 1].latitude) * latToM
      const dLng = (waypoints[i].longitude - waypoints[i - 1].longitude) * lngToM
      totalDistance += Math.sqrt(dLat * dLat + dLng * dLng)
    }

    const estimatedDurationMin = (totalDistance / speed) / 60
    const estimatedPhotos = waypoints.filter(w => w.actions.some(a => a.action_type === 'take_photo')).length
    const coverageAreaHa = (widthM * heightM) / 10000
    const batteryRequired = Math.ceil(estimatedDurationMin / 35) // Assuming 35 min per battery

    const mission: DjiWaypointMission = {
      mission_name: name,
      waylines: [{
        wayline_id: 1,
        speed,
        waypoints,
      }],
      out_of_control_action: 'go_home',
      global_height: altitude,
      auto_flight_speed: speed,
    }

    const stats = {
      estimatedDurationMin: Math.round(estimatedDurationMin * 10) / 10,
      estimatedPhotos,
      coverageAreaHa: Math.round(coverageAreaHa * 100) / 100,
      flightDistanceM: Math.round(totalDistance),
      lineSpacingM: Math.round(lineSpacingM * 100) / 100,
      photoIntervalM: Math.round(photoIntervalM * 100) / 100,
      gsdCm: Math.round(gsdCm * 100) / 100,
      batteryRequired,
    }

    this.log.info(
      { ...stats, waypointCount: waypoints.length },
      'Flight plan generated',
    )

    return { mission, stats }
  }
}
