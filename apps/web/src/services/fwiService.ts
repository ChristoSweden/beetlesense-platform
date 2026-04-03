/**
 * Fire Weather Index (FWI) Service
 *
 * Implements the Canadian Forest Fire Weather Index System (Van Wagner 1987),
 * widely adopted across Europe including Sweden (via SMHI/MSB).
 *
 * The system has three moisture codes and three fire behaviour indices:
 *
 * Moisture Codes (fuel moisture tracking):
 *   FFMC — Fine Fuel Moisture Code: surface litter moisture (response time ~2/3 day)
 *   DMC  — Duff Moisture Code: loosely compacted organic layers (response time ~15 days)
 *   DC   — Drought Code: deep compact organic layers (response time ~52 days)
 *
 * Fire Behaviour Indices:
 *   ISI  — Initial Spread Index = f(FFMC, wind)
 *   BUI  — Buildup Index = f(DMC, DC)
 *   FWI  — Fire Weather Index = f(ISI, BUI)
 *
 * Swedish calibration based on MSB/SMHI fire danger classes (brandriskklasser).
 *
 * References:
 *   Van Wagner CE (1987) Development and structure of the Canadian Forest
 *     Fire Weather Index System. Forestry Technical Report 35.
 *   SMHI (2023) Brandrisk i skog och mark — beräkningsmetodik.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WeatherInput {
  /** Temperature in °C (noon reading) */
  temp: number;
  /** Relative humidity in % (noon reading) */
  humidity: number;
  /** Wind speed in km/h (10m open, noon reading) */
  wind: number;
  /** 24-hour rainfall in mm */
  rain: number;
}

export interface FWIComponents {
  /** Fine Fuel Moisture Code (0-101) */
  ffmc: number;
  /** Duff Moisture Code (0-∞, typically 0-300+) */
  dmc: number;
  /** Drought Code (0-∞, typically 0-800+) */
  dc: number;
  /** Initial Spread Index */
  isi: number;
  /** Buildup Index */
  bui: number;
}

export interface FWIResult extends FWIComponents {
  /** Fire Weather Index */
  fwi: number;
  /** Danger class string */
  dangerClass: string;
  /** Swedish MSB/SMHI danger level (1-5) */
  swedishDangerLevel: number;
  /** Danger class label in Swedish */
  dangerClassSv: string;
  /** Color code for UI display */
  color: string;
}

// ─── Default Previous Values ───────────────────────────────────────────────

const DEFAULT_PREVIOUS: FWIComponents = {
  ffmc: 85, // mid-range initial value
  dmc: 6,   // spring startup value
  dc: 15,   // spring startup value
  isi: 0,
  bui: 0,
};

// ─── FFMC Calculation ─────────────────────────────────────────────────────

/**
 * Fine Fuel Moisture Code — tracks moisture in surface litter.
 * Based on Van Wagner (1987) equations.
 */
function calcFFMC(temp: number, rh: number, wind: number, rain: number, prevFFMC: number): number {
  // Convert FFMC to moisture content (mo)
  let mo = 147.2 * (101 - prevFFMC) / (59.5 + prevFFMC);

  // Rain phase — wetting
  if (rain > 0.5) {
    const rf = rain - 0.5;
    if (mo <= 150) {
      mo = mo + 42.5 * rf * Math.exp(-100 / (251 - mo)) * (1 - Math.exp(-6.93 / rf));
    } else {
      mo = mo + 42.5 * rf * Math.exp(-100 / (251 - mo)) * (1 - Math.exp(-6.93 / rf))
           + 0.0015 * Math.pow(mo - 150, 2) * Math.pow(rf, 0.5);
    }
    if (mo > 250) mo = 250;
  }

  // Equilibrium Moisture Content for drying (Ed)
  const Ed = 0.942 * Math.pow(rh, 0.679)
           + 11 * Math.exp((rh - 100) / 10)
           + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh));

  // Equilibrium Moisture Content for wetting (Ew)
  const Ew = 0.618 * Math.pow(rh, 0.753)
           + 10 * Math.exp((rh - 100) / 10)
           + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh));

  let m: number;

  if (mo > Ed) {
    // Drying phase
    const ko = 0.424 * (1 - Math.pow(rh / 100, 1.7))
             + 0.0694 * Math.pow(wind, 0.5) * (1 - Math.pow(rh / 100, 8));
    const kd = ko * 0.581 * Math.exp(0.0365 * temp);
    m = Ed + (mo - Ed) * Math.pow(10, -kd);
  } else if (mo < Ew) {
    // Wetting phase
    const k1 = 0.424 * (1 - Math.pow((100 - rh) / 100, 1.7))
             + 0.0694 * Math.pow(wind, 0.5) * (1 - Math.pow((100 - rh) / 100, 8));
    const kw = k1 * 0.581 * Math.exp(0.0365 * temp);
    m = Ew - (Ew - mo) * Math.pow(10, -kw);
  } else {
    m = mo;
  }

  // Convert moisture back to FFMC
  const ffmc = 59.5 * (250 - m) / (147.2 + m);
  return Math.max(0, Math.min(101, Math.round(ffmc * 10) / 10));
}

// ─── DMC Calculation ──────────────────────────────────────────────────────

/**
 * Duff Moisture Code — tracks moisture in loosely compacted organic layers.
 * Responds to rain over several days.
 */
function calcDMC(temp: number, rh: number, rain: number, prevDMC: number, month: number): number {
  // Effective day-length adjustment factors (Le) for latitude ~57°N (southern Sweden)
  const Le = [6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8.0, 7.0, 6.0];
  const el = Le[month] ?? 9;

  let dmc = prevDMC;

  // Rain phase
  if (rain > 1.5) {
    const re = 0.92 * rain - 1.27;
    let mo = 20 + Math.exp(5.6348 - dmc / 43.43);
    if (dmc <= 33) {
      const b = 100 / (0.5 + 0.3 * dmc);
      mo = mo + 1000 * re / (48.77 + b * re);
    } else if (dmc <= 65) {
      const b = 14 - 1.3 * Math.log(dmc);
      mo = mo + 1000 * re / (48.77 + b * re);
    } else {
      const b = 6.2 * Math.log(dmc) - 17.2;
      mo = mo + 1000 * re / (48.77 + b * re);
    }
    dmc = 244.72 - 43.43 * Math.log(mo - 20);
    if (dmc < 0) dmc = 0;
  }

  // Drying phase (only if temp > -1.1°C)
  if (temp > -1.1) {
    const k = 1.894 * (temp + 1.1) * (100 - rh) * el * 0.000001;
    dmc = dmc + 100 * k;
  }

  return Math.max(0, Math.round(dmc * 10) / 10);
}

// ─── DC Calculation ───────────────────────────────────────────────────────

/**
 * Drought Code — tracks moisture in deep, compact organic layers.
 * Slowest responding code (~52 day lag time).
 */
function calcDC(temp: number, rain: number, prevDC: number, month: number): number {
  // Monthly day-length factor for latitude ~57°N
  const Lf = [-1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6];
  const fl = Lf[month] ?? 0;

  let dc = prevDC;

  // Rain phase
  if (rain > 2.8) {
    const rd = 0.83 * rain - 1.27;
    const Qo = 800 * Math.exp(-dc / 400);
    const Qr = Qo + 3.937 * rd;
    const Dr = 400 * Math.log(800 / Qr);
    dc = Math.max(0, Dr);
  }

  // Drying phase
  if (temp > -2.8) {
    const V = 0.36 * (temp + 2.8) + fl;
    if (V > 0) {
      dc = dc + 0.5 * V;
    }
  }

  return Math.max(0, Math.round(dc * 10) / 10);
}

// ─── ISI Calculation ──────────────────────────────────────────────────────

/**
 * Initial Spread Index — combines wind and fine fuel moisture
 * into a measure of expected fire spread rate.
 */
function calcISI(ffmc: number, wind: number): number {
  const fm = 147.2 * (101 - ffmc) / (59.5 + ffmc);
  const sf = 19.115 * Math.exp(-0.1386 * fm) * (1 + Math.pow(fm, 5.31) / 49300000);
  const isi = sf * Math.exp(0.05039 * wind);
  return Math.round(isi * 10) / 10;
}

// ─── BUI Calculation ──────────────────────────────────────────────────────

/**
 * Buildup Index — combines DMC and DC into a measure
 * of total fuel available for combustion.
 */
function calcBUI(dmc: number, dc: number): number {
  if (dmc <= 0 && dc <= 0) return 0;

  let bui: number;
  if (dmc <= 0.4 * dc) {
    bui = 0.8 * dmc * dc / (dmc + 0.4 * dc);
  } else {
    bui = dmc - (1 - 0.8 * dc / (dmc + 0.4 * dc))
        * (0.92 + Math.pow(0.0114 * dmc, 1.7));
  }

  return Math.max(0, Math.round(bui * 10) / 10);
}

// ─── FWI Calculation ──────────────────────────────────────────────────────

/**
 * Fire Weather Index — final composite index combining ISI and BUI.
 * Represents fire intensity.
 */
function calcFWI(isi: number, bui: number): number {
  let fd: number;

  if (bui <= 80) {
    fd = 0.626 * Math.pow(bui, 0.809) + 2;
  } else {
    fd = 1000 / (25 + 108.64 * Math.exp(-0.023 * bui));
  }

  const B = 0.1 * isi * fd;

  let fwi: number;
  if (B > 1) {
    fwi = Math.exp(2.72 * Math.pow(0.434 * Math.log(B), 0.647));
  } else {
    fwi = B;
  }

  return Math.round(fwi * 10) / 10;
}

// ─── Danger Classification ────────────────────────────────────────────────

/**
 * Swedish MSB/SMHI fire danger classification.
 * Maps FWI to 5-level danger scale used in Sweden.
 *
 * Swedish thresholds (calibrated for boreal/hemiboreal forests):
 *   Level 1: FWI 0-4     — Very Low (Mycket låg)
 *   Level 2: FWI 5-11    — Low (Låg)
 *   Level 3: FWI 12-21   — Moderate (Måttlig)
 *   Level 4: FWI 22-37   — High (Hög)
 *   Level 5: FWI 38+     — Very High / Extreme (Mycket hög / Extrem)
 */
function classifyDanger(fwi: number): { dangerClass: string; swedishDangerLevel: number; dangerClassSv: string; color: string } {
  if (fwi < 5) {
    return { dangerClass: 'Low', swedishDangerLevel: 1, dangerClassSv: 'Mycket låg', color: '#3b82f6' };
  }
  if (fwi < 12) {
    return { dangerClass: 'Moderate', swedishDangerLevel: 2, dangerClassSv: 'Låg', color: '#22c55e' };
  }
  if (fwi < 22) {
    return { dangerClass: 'High', swedishDangerLevel: 3, dangerClassSv: 'Måttlig', color: '#eab308' };
  }
  if (fwi < 38) {
    return { dangerClass: 'Very High', swedishDangerLevel: 4, dangerClassSv: 'Hög', color: '#f97316' };
  }
  return { dangerClass: 'Extreme', swedishDangerLevel: 5, dangerClassSv: 'Mycket hög', color: '#ef4444' };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Calculate the complete Fire Weather Index from weather observations.
 *
 * @param weather — noon weather observations (temp °C, humidity %, wind km/h, rain mm)
 * @param previous — previous day's moisture codes (optional, uses defaults if omitted)
 * @param month — month index 0-11 (optional, uses current month if omitted)
 */
export function calculateFWI(
  weather: WeatherInput,
  previous?: FWIComponents,
  month?: number,
): FWIResult {
  const prev = previous ?? DEFAULT_PREVIOUS;
  const m = month ?? new Date().getMonth();

  // Step 1: Calculate moisture codes
  const ffmc = calcFFMC(weather.temp, weather.humidity, weather.wind, weather.rain, prev.ffmc);
  const dmc = calcDMC(weather.temp, weather.humidity, weather.rain, prev.dmc, m);
  const dc = calcDC(weather.temp, weather.rain, prev.dc, m);

  // Step 2: Calculate fire behaviour indices
  const isi = calcISI(ffmc, weather.wind);
  const bui = calcBUI(dmc, dc);

  // Step 3: Calculate final FWI
  const fwi = calcFWI(isi, bui);

  // Step 4: Classify danger
  const danger = classifyDanger(fwi);

  return {
    ffmc,
    dmc,
    dc,
    isi,
    bui,
    fwi,
    ...danger,
  };
}

/**
 * Calculate a multi-day FWI sequence from a series of weather observations.
 * Each day's codes feed into the next day's calculation.
 */
export function calculateFWISequence(
  weatherDays: WeatherInput[],
  initial?: FWIComponents,
  startMonth?: number,
): FWIResult[] {
  const results: FWIResult[] = [];
  let prev = initial ?? DEFAULT_PREVIOUS;
  let month = startMonth ?? new Date().getMonth();

  for (let i = 0; i < weatherDays.length; i++) {
    const result = calculateFWI(weatherDays[i], prev, month);
    results.push(result);

    // Carry forward moisture codes
    prev = {
      ffmc: result.ffmc,
      dmc: result.dmc,
      dc: result.dc,
      isi: result.isi,
      bui: result.bui,
    };

    // Advance month if needed (rough: every 30 days)
    if (i > 0 && i % 30 === 0) {
      month = (month + 1) % 12;
    }
  }

  return results;
}

/**
 * Get a demo FWI result for current conditions in Småland.
 * Uses seasonal weather approximation.
 */
export function getDemoFWI(): FWIResult {
  const now = new Date();
  const month = now.getMonth();

  // Seasonal weather patterns for Småland (~57°N)
  const seasonal: Record<number, WeatherInput> = {
    0: { temp: -3, humidity: 88, wind: 12, rain: 2.1 },
    1: { temp: -2, humidity: 85, wind: 14, rain: 1.5 },
    2: { temp: 2, humidity: 75, wind: 12, rain: 1.8 },
    3: { temp: 7, humidity: 62, wind: 10, rain: 1.2 },
    4: { temp: 13, humidity: 55, wind: 8, rain: 1.0 },
    5: { temp: 17, humidity: 58, wind: 7, rain: 1.5 },
    6: { temp: 20, humidity: 55, wind: 6, rain: 1.2 },
    7: { temp: 18, humidity: 62, wind: 7, rain: 2.0 },
    8: { temp: 13, humidity: 70, wind: 9, rain: 2.5 },
    9: { temp: 8, humidity: 78, wind: 11, rain: 2.8 },
    10: { temp: 3, humidity: 85, wind: 12, rain: 2.5 },
    11: { temp: -1, humidity: 90, wind: 13, rain: 2.2 },
  };

  const weather = seasonal[month] ?? seasonal[6];

  // Seasonal previous codes (higher in summer, lower in winter)
  const seasonalPrev: FWIComponents = {
    ffmc: month >= 5 && month <= 8 ? 82 + Math.random() * 10 : 50 + Math.random() * 20,
    dmc: month >= 5 && month <= 8 ? 30 + Math.random() * 40 : 5 + Math.random() * 15,
    dc: month >= 5 && month <= 8 ? 150 + Math.random() * 200 : 20 + Math.random() * 50,
    isi: 0,
    bui: 0,
  };

  return calculateFWI(weather, seasonalPrev, month);
}
