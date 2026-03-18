import { logger } from '../../lib/logger.js'

// ─── Types ───

export type DroneCategory = 'Open' | 'Specific' | 'Certified'
export type OpenSubcategory = 'A1' | 'A2' | 'A3'
export type CertificationType = 'A1/A3' | 'A2' | 'STS-01' | 'STS-02' | 'LUC'
export type DroneClass = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'legacy'

export interface DroneSpecs {
  /** Maximum takeoff weight in grams */
  weightG: number
  /** EU drone class marking */
  droneClass: DroneClass
  /** Has geo-awareness / geo-fencing */
  geoAwareness: boolean
  /** Has remote identification */
  remoteId: boolean
  /** Has low-speed mode (< 3 m/s) */
  lowSpeedMode: boolean
}

export interface FlightParams {
  /** Altitude AGL in meters */
  altitudeM: number
  /** Minimum distance to uninvolved people in meters */
  distanceToPeopleM: number
  /** Flight over assemblies of people */
  overAssembly: boolean
  /** Beyond Visual Line of Sight */
  bvlos: boolean
  /** Over urban/populated area */
  overUrban: boolean
  /** Estimated max flight distance from pilot in meters */
  maxDistanceFromPilotM: number
}

export interface PilotCertifications {
  /** A1/A3 basic certificate */
  a1a3: boolean
  /** A2 additional certificate */
  a2: boolean
  /** STS-01 (VLOS over populated area) */
  sts01: boolean
  /** STS-02 (BVLOS with observers) */
  sts02: boolean
  /** Light UAS Operator Certificate */
  luc: boolean
  /** Transportstyrelsen operator registration number */
  transportstyrRegistration: string | null
  /** Valid insurance */
  hasInsurance: boolean
}

export interface EasaComplianceResult {
  /** Required operational category */
  category: DroneCategory
  /** Required subcategory (for Open category) */
  subcategory: OpenSubcategory | null
  /** Whether certification is required */
  requiresCertification: boolean
  /** List of required certifications */
  requiredCerts: CertificationType[]
  /** Operational volume description */
  operationalVolume: {
    maxAltitudeM: number
    maxDistanceM: number | null
    description: string
  }
  /** Whether pilot meets requirements */
  pilotQualified: boolean | null
  /** Missing requirements */
  missingRequirements: string[]
  /** Additional Swedish-specific requirements */
  swedishRequirements: string[]
  /** Regulatory references */
  regulations: string[]
}

export interface RegistrationCheckResult {
  registered: boolean
  operatorId: string | null
  registrationType: 'individual' | 'organization' | null
  validUntil: string | null
  insured: boolean
}

// ─── Weight Class Boundaries (grams) ───

const WEIGHT_C0_MAX = 250
const WEIGHT_C1_MAX = 900
const WEIGHT_C2_MAX = 4000
const WEIGHT_C3_MAX = 25000
const WEIGHT_C4_MAX = 25000

/** Maximum altitude for open category (meters AGL) */
const OPEN_MAX_ALTITUDE_M = 120

/**
 * EasaComplianceService — EASA drone regulation compliance checker with Swedish specifics.
 *
 * Implements:
 * - EU Regulation 2019/947 (drone operations)
 * - EU Regulation 2019/945 (drone technical standards)
 * - Swedish implementation via Transportstyrelsen (TSFS 2021:74)
 *
 * Categories:
 * - Open (A1/A2/A3): low risk, no authorization needed
 * - Specific: medium risk, requires operational authorization or STS declaration
 * - Certified: high risk, requires type certificate + operator certificate
 */
export class EasaComplianceService {
  private readonly log = logger.child({ service: 'easa-compliance' })

  // ─── Public API ───

  /**
   * Determine the required EASA category and certifications for a planned flight.
   */
  determineCategory(
    drone: DroneSpecs,
    flight: FlightParams,
    pilot?: PilotCertifications,
  ): EasaComplianceResult {
    this.log.info(
      { droneClass: drone.droneClass, weightG: drone.weightG, altitudeM: flight.altitudeM },
      'Determining EASA category',
    )

    const missingRequirements: string[] = []
    const swedishRequirements: string[] = []
    const regulations: string[] = ['EU 2019/947', 'EU 2019/945']

    // ── Always required in Sweden ──
    swedishRequirements.push('Registrering hos Transportstyrelsen krävs för drönare ≥250g eller med kamera')
    swedishRequirements.push('Ansvarsförsäkring obligatorisk')
    regulations.push('TSFS 2021:74')

    if (drone.weightG >= WEIGHT_C0_MAX || true /* all camera drones */) {
      swedishRequirements.push('UAS-operatörsnummer ska vara synligt på drönaren')
    }

    // ── Certified category triggers ──
    if (this.requiresCertified(drone, flight)) {
      return this.buildCertifiedResult(drone, flight, pilot, missingRequirements, swedishRequirements, regulations)
    }

    // ── Specific category triggers ──
    if (this.requiresSpecific(drone, flight)) {
      return this.buildSpecificResult(drone, flight, pilot, missingRequirements, swedishRequirements, regulations)
    }

    // ── Open category — determine subcategory ──
    return this.buildOpenResult(drone, flight, pilot, missingRequirements, swedishRequirements, regulations)
  }

  /**
   * Check if a pilot has the required certifications for a given category.
   */
  checkPilotCertifications(
    pilot: PilotCertifications,
    requiredCerts: CertificationType[],
  ): { qualified: boolean; missing: CertificationType[] } {
    const missing: CertificationType[] = []

    for (const cert of requiredCerts) {
      switch (cert) {
        case 'A1/A3':
          if (!pilot.a1a3) missing.push(cert)
          break
        case 'A2':
          if (!pilot.a2) missing.push(cert)
          break
        case 'STS-01':
          if (!pilot.sts01) missing.push(cert)
          break
        case 'STS-02':
          if (!pilot.sts02) missing.push(cert)
          break
        case 'LUC':
          if (!pilot.luc) missing.push(cert)
          break
      }
    }

    return {
      qualified: missing.length === 0,
      missing,
    }
  }

  /**
   * Check Transportstyrelsen registration status.
   * In production, this queries the Transportstyrelsen API.
   */
  async checkRegistration(operatorId: string): Promise<RegistrationCheckResult> {
    this.log.info({ operatorId }, 'Checking Transportstyrelsen registration')

    // Demo/development: return simulated result
    if (!process.env.TRANSPORTSTYRELSEN_API_KEY) {
      this.log.warn('TRANSPORTSTYRELSEN_API_KEY not set — returning demo registration data')
      return {
        registered: operatorId.startsWith('SWE'),
        operatorId,
        registrationType: 'organization',
        validUntil: '2027-01-01',
        insured: true,
      }
    }

    try {
      const response = await fetch(
        `https://api.transportstyrelsen.se/uas/v1/operators/${encodeURIComponent(operatorId)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TRANSPORTSTYRELSEN_API_KEY}`,
            Accept: 'application/json',
          },
        },
      )

      if (response.status === 404) {
        return { registered: false, operatorId: null, registrationType: null, validUntil: null, insured: false }
      }

      if (!response.ok) {
        throw new Error(`Transportstyrelsen API error: ${response.status}`)
      }

      const data = (await response.json()) as {
        operator_id: string
        registration_type: 'individual' | 'organization'
        valid_until: string
        insurance_valid: boolean
      }

      return {
        registered: true,
        operatorId: data.operator_id,
        registrationType: data.registration_type,
        validUntil: data.valid_until,
        insured: data.insurance_valid,
      }
    } catch (err) {
      this.log.error({ err }, 'Transportstyrelsen API check failed')
      throw err
    }
  }

  /**
   * Get human-readable (Swedish) summary of compliance requirements.
   */
  getSummary(result: EasaComplianceResult): string {
    const lines: string[] = []

    lines.push(`Kategori: ${result.category}${result.subcategory ? ` (${result.subcategory})` : ''}`)
    lines.push(`Max höjd: ${result.operationalVolume.maxAltitudeM}m`)

    if (result.requiredCerts.length > 0) {
      lines.push(`Krävda certifikat: ${result.requiredCerts.join(', ')}`)
    }

    if (result.missingRequirements.length > 0) {
      lines.push(`Saknade krav:`)
      result.missingRequirements.forEach(r => lines.push(`  - ${r}`))
    }

    if (result.swedishRequirements.length > 0) {
      lines.push(`Svenska krav:`)
      result.swedishRequirements.forEach(r => lines.push(`  - ${r}`))
    }

    return lines.join('\n')
  }

  // ─── Private: Category Determination ───

  private requiresCertified(drone: DroneSpecs, flight: FlightParams): boolean {
    // Certified required for: transporting people, dangerous goods, very large drones
    return drone.weightG > WEIGHT_C3_MAX && flight.overUrban && flight.overAssembly
  }

  private requiresSpecific(drone: DroneSpecs, flight: FlightParams): boolean {
    return (
      flight.bvlos ||
      flight.altitudeM > OPEN_MAX_ALTITUDE_M ||
      (drone.weightG > WEIGHT_C2_MAX && (flight.overUrban || flight.distanceToPeopleM < 150)) ||
      (flight.overAssembly && drone.weightG > WEIGHT_C1_MAX)
    )
  }

  private buildOpenResult(
    drone: DroneSpecs,
    flight: FlightParams,
    pilot: PilotCertifications | undefined,
    missingRequirements: string[],
    swedishRequirements: string[],
    regulations: string[],
  ): EasaComplianceResult {
    let subcategory: OpenSubcategory
    const requiredCerts: CertificationType[] = []

    if (drone.weightG <= WEIGHT_C0_MAX && drone.droneClass === 'C0') {
      // A1: Can fly over people (not assemblies), < 250g
      subcategory = 'A1'
      requiredCerts.push('A1/A3')
    } else if (
      drone.droneClass === 'C1' &&
      drone.weightG <= WEIGHT_C1_MAX
    ) {
      // A1 with C1: can fly near people but not over uninvolved
      subcategory = 'A1'
      requiredCerts.push('A1/A3')
    } else if (
      drone.droneClass === 'C2' &&
      drone.weightG <= WEIGHT_C2_MAX &&
      flight.distanceToPeopleM >= 30
    ) {
      // A2: min 30m from people (5m in low-speed mode)
      subcategory = 'A2'
      requiredCerts.push('A1/A3', 'A2')

      if (flight.distanceToPeopleM < 30 && !drone.lowSpeedMode) {
        missingRequirements.push('A2: Minst 30m avstånd till personer krävs (eller 5m med låghastighetsläge)')
      }
    } else {
      // A3: Far from people, no urban areas
      subcategory = 'A3'
      requiredCerts.push('A1/A3')

      if (flight.distanceToPeopleM < 150) {
        missingRequirements.push('A3: Minst 150m avstånd till bostads-, kommersiella och industriområden')
      }
      if (flight.overUrban) {
        missingRequirements.push('A3: Flygning över tätbebyggt område är ej tillåten')
      }
    }

    // Check altitude
    if (flight.altitudeM > OPEN_MAX_ALTITUDE_M) {
      missingRequirements.push(`Max höjd i öppen kategori: ${OPEN_MAX_ALTITUDE_M}m (planerad: ${flight.altitudeM}m)`)
    }

    // Check pilot certs if provided
    let pilotQualified: boolean | null = null
    if (pilot) {
      const certCheck = this.checkPilotCertifications(pilot, requiredCerts)
      pilotQualified = certCheck.qualified
      if (!certCheck.qualified) {
        certCheck.missing.forEach(c => missingRequirements.push(`Saknar certifikat: ${c}`))
      }
      if (!pilot.transportstyrRegistration) {
        missingRequirements.push('Saknar registrering hos Transportstyrelsen')
      }
      if (!pilot.hasInsurance) {
        missingRequirements.push('Saknar ansvarsförsäkring')
      }
    }

    return {
      category: 'Open',
      subcategory,
      requiresCertification: true,
      requiredCerts,
      operationalVolume: {
        maxAltitudeM: OPEN_MAX_ALTITUDE_M,
        maxDistanceM: null, // VLOS, no fixed distance
        description: this.getSubcategoryDescription(subcategory),
      },
      pilotQualified,
      missingRequirements,
      swedishRequirements,
      regulations,
    }
  }

  private buildSpecificResult(
    drone: DroneSpecs,
    flight: FlightParams,
    pilot: PilotCertifications | undefined,
    missingRequirements: string[],
    swedishRequirements: string[],
    regulations: string[],
  ): EasaComplianceResult {
    const requiredCerts: CertificationType[] = ['A1/A3']

    let stsType: 'STS-01' | 'STS-02' | null = null

    if (flight.bvlos) {
      stsType = 'STS-02'
      requiredCerts.push('STS-02')
      swedishRequirements.push('BVLOS kräver operativt tillstånd eller STS-02 deklaration')
      swedishRequirements.push('Visuella observatörer krävs vid STS-02')
    } else if (flight.overUrban && drone.weightG > WEIGHT_C2_MAX) {
      stsType = 'STS-01'
      requiredCerts.push('STS-01')
      swedishRequirements.push('Flygning i tätort med drönare >4kg kräver STS-01')
    }

    if (flight.altitudeM > OPEN_MAX_ALTITUDE_M) {
      swedishRequirements.push(`Höjd över ${OPEN_MAX_ALTITUDE_M}m kräver operativt tillstånd från Transportstyrelsen`)
    }

    let pilotQualified: boolean | null = null
    if (pilot) {
      const certCheck = this.checkPilotCertifications(pilot, requiredCerts)
      pilotQualified = certCheck.qualified
      certCheck.missing.forEach(c => missingRequirements.push(`Saknar certifikat: ${c}`))
    }

    return {
      category: 'Specific',
      subcategory: null,
      requiresCertification: true,
      requiredCerts,
      operationalVolume: {
        maxAltitudeM: flight.bvlos ? 120 : Math.min(flight.altitudeM, 150),
        maxDistanceM: flight.bvlos ? 2000 : null,
        description: stsType
          ? `Specifik kategori (${stsType}): Kräver deklaration eller operativt tillstånd`
          : 'Specifik kategori: Kräver operativt tillstånd från Transportstyrelsen',
      },
      pilotQualified,
      missingRequirements,
      swedishRequirements,
      regulations: [...regulations, 'EU 2019/947 Art. 12'],
    }
  }

  private buildCertifiedResult(
    drone: DroneSpecs,
    flight: FlightParams,
    pilot: PilotCertifications | undefined,
    missingRequirements: string[],
    swedishRequirements: string[],
    regulations: string[],
  ): EasaComplianceResult {
    missingRequirements.push('Certifierad kategori kräver typgodkännande av drönaren')
    missingRequirements.push('Operatörscertifikat (LUC) krävs')
    swedishRequirements.push('Kontakta Transportstyrelsen för certifierad kategori')

    return {
      category: 'Certified',
      subcategory: null,
      requiresCertification: true,
      requiredCerts: ['LUC'],
      operationalVolume: {
        maxAltitudeM: flight.altitudeM,
        maxDistanceM: null,
        description: 'Certifierad kategori: Kräver typgodkänd drönare och operatörscertifikat (LUC)',
      },
      pilotQualified: pilot?.luc ?? null,
      missingRequirements,
      swedishRequirements,
      regulations: [...regulations, 'EU 2019/947 Art. 14'],
    }
  }

  private getSubcategoryDescription(sub: OpenSubcategory): string {
    const descriptions: Record<OpenSubcategory, string> = {
      A1: 'Öppen A1: Flygning nära/över personer (ej folksamlingar). Drönare <900g, C0/C1.',
      A2: 'Öppen A2: Flygning nära personer (min 30m, 5m i låghastighetsläge). Drönare <4kg, C2.',
      A3: 'Öppen A3: Flygning långt från personer (min 150m från tätort). Drönare <25kg, C3/C4.',
    }
    return descriptions[sub]
  }
}
