import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

/**
 * DJI Mission Management Edge Function
 *
 * Endpoints:
 * POST /generate-plan  — Generate a waypoint flight plan for a parcel
 * POST /create         — Create a mission record + upload plan to DJI Cloud
 * POST /sync-media     — Trigger media sync after mission completion
 * GET  /status/:id     — Get mission status and telemetry summary
 */

// ─── Lawnmower Flight Plan Generator ───

interface FlightPlanRequest {
  parcel_id: string
  sensors: string[] // ['rgb', 'multispectral', 'thermal']
  altitude_m?: number
  overlap_front?: number
  overlap_side?: number
  speed_ms?: number
}

function generateLawnmowerPlan(
  boundary: number[][],
  altitude: number,
  overlapFront: number,
  overlapSide: number,
  speed: number,
  sensors: string[],
) {
  // Sensor GSD calculation (DJI Mavic 3 Enterprise defaults)
  const sensorWidthMm = sensors.includes('multispectral') ? 8.8 : 17.3
  const focalLengthMm = sensors.includes('multispectral') ? 5.74 : 12.3
  const imageWidthPx = sensors.includes('multispectral') ? 1600 : 5280
  const imageHeightPx = sensors.includes('multispectral') ? 1300 : 3956

  const gsdM = (altitude * sensorWidthMm) / (focalLengthMm * imageWidthPx) / 1000
  const footprintW = gsdM * imageWidthPx
  const footprintH = gsdM * imageHeightPx
  const lineSpacing = footprintW * (1 - overlapSide / 100)
  const photoInterval = footprintH * (1 - overlapFront / 100)

  // Bounding box
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of boundary) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  const latToM = 111320
  const lngToM = 111320 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
  const widthM = (maxLng - minLng) * lngToM
  const heightM = (maxLat - minLat) * latToM

  const flyAlongWidth = widthM > heightM
  const flightLen = flyAlongWidth ? heightM : widthM
  const lineCount = Math.ceil((flyAlongWidth ? widthM : heightM) / lineSpacing) + 1

  const waypoints: Array<{ lat: number; lng: number; alt: number; heading: number }> = []

  for (let i = 0; i < lineCount; i++) {
    const forward = i % 2 === 0
    const offset = i * lineSpacing
    const photosPerLine = Math.ceil(flightLen / photoInterval) + 1

    for (let p = 0; p < photosPerLine; p++) {
      const t = p / Math.max(1, photosPerLine - 1)
      let lat: number, lng: number

      if (flyAlongWidth) {
        lng = minLng + offset / lngToM
        lat = forward ? minLat + t * (maxLat - minLat) : maxLat - t * (maxLat - minLat)
      } else {
        lat = minLat + offset / latToM
        lng = forward ? minLng + t * (maxLng - minLng) : maxLng - t * (maxLng - minLng)
      }

      waypoints.push({
        lat, lng,
        alt: altitude,
        heading: flyAlongWidth ? (forward ? 0 : 180) : (forward ? 90 : 270),
      })
    }
  }

  // Stats
  let totalDist = 0
  for (let i = 1; i < waypoints.length; i++) {
    const dLat = (waypoints[i].lat - waypoints[i - 1].lat) * latToM
    const dLng = (waypoints[i].lng - waypoints[i - 1].lng) * lngToM
    totalDist += Math.sqrt(dLat * dLat + dLng * dLng)
  }

  return {
    waypoints,
    stats: {
      gsd_cm: Math.round(gsdM * 10000) / 100,
      line_spacing_m: Math.round(lineSpacing * 100) / 100,
      photo_interval_m: Math.round(photoInterval * 100) / 100,
      estimated_photos: waypoints.length,
      estimated_duration_min: Math.round((totalDist / speed) / 60 * 10) / 10,
      flight_distance_m: Math.round(totalDist),
      coverage_area_ha: Math.round(widthM * heightM / 10000 * 100) / 100,
      batteries_needed: Math.ceil((totalDist / speed) / 60 / 35),
    },
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const user = await requireAuth(req)
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean).pop()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ─── POST /generate-plan ───
    if (path === 'generate-plan' && req.method === 'POST') {
      const body = await req.json() as FlightPlanRequest

      // Fetch parcel boundary
      const { data: parcel } = await supabase
        .from('parcels')
        .select('boundary_wgs84, name, area_ha')
        .eq('id', body.parcel_id)
        .single()

      if (!parcel?.boundary_wgs84) {
        return errorResponse('Parcel not found or missing boundary', 404)
      }

      const boundary = (parcel.boundary_wgs84 as { coordinates: number[][][] }).coordinates[0]
      const plan = generateLawnmowerPlan(
        boundary,
        body.altitude_m ?? 80,
        body.overlap_front ?? 80,
        body.overlap_side ?? 70,
        body.speed_ms ?? 5,
        body.sensors ?? ['rgb'],
      )

      return jsonResponse({
        parcel_name: parcel.name,
        parcel_area_ha: parcel.area_ha,
        sensors: body.sensors,
        altitude_m: body.altitude_m ?? 80,
        ...plan,
      })
    }

    // ─── POST /create ───
    if (path === 'create' && req.method === 'POST') {
      const body = await req.json()

      const { data: mission, error } = await supabase
        .from('dji_missions')
        .insert({
          parcel_id: body.parcel_id,
          survey_id: body.survey_id,
          aircraft_id: body.aircraft_id,
          pilot_id: user.id,
          name: body.name ?? 'BeetleSense Survey',
          mission_type: body.mission_type ?? 'mapping',
          altitude_m: body.altitude_m ?? 80,
          speed_ms: body.speed_ms ?? 5,
          overlap_front: body.overlap_front ?? 80,
          overlap_side: body.overlap_side ?? 70,
          gimbal_pitch: -90,
          sensors_enabled: body.sensors ?? ['rgb'],
          waypoints: body.waypoints ?? [],
          estimated_duration_min: body.estimated_duration_min,
          estimated_photos: body.estimated_photos,
          coverage_area_ha: body.coverage_area_ha,
          flight_distance_m: body.flight_distance_m,
          status: 'planned',
        })
        .select('id')
        .single()

      if (error) return errorResponse(error.message, 400)

      return jsonResponse({ mission_id: mission.id, status: 'planned' })
    }

    // ─── GET /status/:id ───
    if (path && req.method === 'GET' && path !== 'generate-plan' && path !== 'create' && path !== 'sync-media') {
      const { data: mission } = await supabase
        .from('dji_missions')
        .select('*, dji_aircraft(model_name, serial_number)')
        .eq('id', path)
        .single()

      if (!mission) return errorResponse('Mission not found', 404)

      // Get latest telemetry
      const { data: telemetry } = await supabase
        .from('dji_telemetry')
        .select('*')
        .eq('mission_id', path)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get media count
      const { count: mediaCount } = await supabase
        .from('dji_media')
        .select('*', { count: 'exact', head: true })
        .eq('mission_id', path)

      return jsonResponse({
        mission,
        latest_telemetry: telemetry,
        media_count: mediaCount ?? 0,
      })
    }

    return errorResponse('Not found', 404)
  } catch (err) {
    console.error('DJI mission error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
