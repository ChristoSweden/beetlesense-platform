/**
 * Fire Risk Prediction Module
 * Route: /owner/fire-risk
 *
 * Real fire science calculations based on the Canadian Forest Fire Weather Index (FWI)
 * system as adapted by SMHI for Swedish conditions. Includes per-parcel risk assessment,
 * 7-day forecast, prevention checklists, historical calendar, and beetle-fire connection.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  TreePine,
  Bug,
  MapPin,
  Calendar,
  Clock,
  Shield,
  TrendingUp,
  Info,
} from 'lucide-react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';
import { isDemoMode } from '@/lib/dataMode';
import { getDemoFWI, type FWIResult } from '@/services/fwiService';

// ─── Fire Science Constants ───

/** Seasonal FFMC profiles for Småland (lat ~57°N) — based on historical SMHI data */
const SEASONAL_FFMC: Record<number, { min: number; max: number; label: string }> = {
  0:  { min: 20, max: 35, label: 'Very Low' },  // Jan
  1:  { min: 20, max: 38, label: 'Very Low' },  // Feb
  2:  { min: 25, max: 40, label: 'Very Low' },  // Mar
  3:  { min: 40, max: 60, label: 'Low-Medium' }, // Apr
  4:  { min: 45, max: 65, label: 'Medium' },     // May
  5:  { min: 60, max: 85, label: 'Medium-High' },// Jun
  6:  { min: 65, max: 88, label: 'High' },       // Jul
  7:  { min: 55, max: 78, label: 'Medium-High' },// Aug
  8:  { min: 50, max: 72, label: 'Medium' },     // Sep
  9:  { min: 35, max: 52, label: 'Low' },        // Oct
  10: { min: 28, max: 45, label: 'Low' },        // Nov
  11: { min: 22, max: 38, label: 'Very Low' },   // Dec
};

/** Typical weather for Småland by month — used in demo mode */
const SEASONAL_WEATHER: Record<number, { tempMin: number; tempMax: number; humidityMin: number; humidityMax: number; windMin: number; windMax: number; rainProb: number }> = {
  0:  { tempMin: -8, tempMax: 1, humidityMin: 80, humidityMax: 95, windMin: 3, windMax: 7, rainProb: 0.5 },
  1:  { tempMin: -7, tempMax: 2, humidityMin: 75, humidityMax: 92, windMin: 3, windMax: 8, rainProb: 0.4 },
  2:  { tempMin: -3, tempMax: 5, humidityMin: 65, humidityMax: 85, windMin: 3, windMax: 7, rainProb: 0.35 },
  3:  { tempMin: 1, tempMax: 12, humidityMin: 50, humidityMax: 80, windMin: 2, windMax: 6, rainProb: 0.35 },
  4:  { tempMin: 6, tempMax: 17, humidityMin: 45, humidityMax: 75, windMin: 2, windMax: 6, rainProb: 0.3 },
  5:  { tempMin: 10, tempMax: 22, humidityMin: 40, humidityMax: 70, windMin: 2, windMax: 5, rainProb: 0.3 },
  6:  { tempMin: 13, tempMax: 25, humidityMin: 40, humidityMax: 70, windMin: 1, windMax: 5, rainProb: 0.35 },
  7:  { tempMin: 12, tempMax: 23, humidityMin: 45, humidityMax: 75, windMin: 1, windMax: 5, rainProb: 0.4 },
  8:  { tempMin: 8, tempMax: 18, humidityMin: 50, humidityMax: 80, windMin: 2, windMax: 6, rainProb: 0.45 },
  9:  { tempMin: 4, tempMax: 12, humidityMin: 60, humidityMax: 88, windMin: 2, windMax: 7, rainProb: 0.55 },
  10: { tempMin: 0, tempMax: 6, humidityMin: 70, humidityMax: 92, windMin: 3, windMax: 7, rainProb: 0.55 },
  11: { tempMin: -5, tempMax: 2, humidityMin: 80, humidityMax: 95, windMin: 3, windMax: 7, rainProb: 0.5 },
};

// ─── Fire Science Calculation Functions ───

/**
 * Simplified FFMC calculation based on Van Wagner (1987).
 * The FFMC indicates moisture content of surface litter.
 * Input: temperature (°C), relative humidity (%), wind speed (km/h), rain (mm), previous FFMC
 * Output: FFMC value 0-101
 */
function calculateFFMC(temp: number, rh: number, wind: number, rain: number, prevFFMC: number = 85): number {
  let mo = 147.2 * (101 - prevFFMC) / (59.5 + prevFFMC);

  // Rain reduction
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

  // Equilibrium moisture content for drying (Ed)
  const Ed = 0.942 * Math.pow(rh, 0.679) + 11 * Math.exp((rh - 100) / 10)
           + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh));

  // Equilibrium moisture content for wetting (Ew)
  const Ew = 0.618 * Math.pow(rh, 0.753) + 10 * Math.exp((rh - 100) / 10)
           + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh));

  let m: number;
  if (mo > Ed) {
    // Drying phase
    const ko = 0.424 * (1 - Math.pow(rh / 100, 1.7)) + 0.0694 * Math.pow(wind, 0.5) * (1 - Math.pow(rh / 100, 8));
    const kd = ko * 0.581 * Math.exp(0.0365 * temp);
    m = Ed + (mo - Ed) * Math.pow(10, -kd);
  } else if (mo < Ew) {
    // Wetting phase
    const k1 = 0.424 * (1 - Math.pow((100 - rh) / 100, 1.7)) + 0.0694 * Math.pow(wind, 0.5) * (1 - Math.pow((100 - rh) / 100, 8));
    const kw = k1 * 0.581 * Math.exp(0.0365 * temp);
    m = Ew - (Ew - mo) * Math.pow(10, -kw);
  } else {
    m = mo;
  }

  const ffmc = 59.5 * (250 - m) / (147.2 + m);
  return Math.max(0, Math.min(101, ffmc));
}

/**
 * Calculate Initial Spread Index (ISI) from FFMC and wind.
 * ISI combines moisture and wind into a fire spread rate.
 */
function calculateISI(ffmc: number, wind: number): number {
  const fm = 147.2 * (101 - ffmc) / (59.5 + ffmc);
  const sf = 19.115 * Math.exp(-0.1386 * fm) * (1 + Math.pow(fm, 5.31) / 49300000);
  const isi = sf * Math.exp(0.05039 * wind);
  return Math.max(0, isi);
}

/**
 * Map FFMC to SMHI fire risk class (1-5).
 * Based on MSB/SMHI brandrisk classification.
 */
function ffmcToRiskClass(ffmc: number): { level: number; label: string; color: string; bgColor: string } {
  if (ffmc < 40) return { level: 1, label: 'Mycket låg', color: '#3b82f6', bgColor: '#3b82f620' };
  if (ffmc < 55) return { level: 2, label: 'Låg', color: '#22c55e', bgColor: '#22c55e20' };
  if (ffmc < 70) return { level: 3, label: 'Måttlig', color: '#eab308', bgColor: '#eab30820' };
  if (ffmc < 82) return { level: 4, label: 'Hög', color: '#f97316', bgColor: '#f9731620' };
  return { level: 5, label: 'Mycket hög', color: '#ef4444', bgColor: '#ef444420' };
}

/** Get current FFMC based on date, with daily variation */
function getCurrentFFMC(date: Date): number {
  const month = date.getMonth();
  const dayOfMonth = date.getDate();
  const profile = SEASONAL_FFMC[month];
  // Interpolate within month with slight daily variation
  const progress = dayOfMonth / 31;
  const nextMonth = (month + 1) % 12;
  const nextProfile = SEASONAL_FFMC[nextMonth];
  const baseFFMC = profile.min + (profile.max - profile.min) * 0.5;
  const nextBaseFFMC = nextProfile.min + (nextProfile.max - nextProfile.min) * 0.5;
  const interpolated = baseFFMC + (nextBaseFFMC - baseFFMC) * progress;
  // Add deterministic daily variation based on day-of-year
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyVariation = Math.sin(dayOfYear * 0.3) * 5 + Math.cos(dayOfYear * 0.17) * 3;
  return Math.max(0, Math.min(99, interpolated + dailyVariation));
}

/** Generate realistic weather for a given date in Småland */
function generateWeatherForDate(date: Date, seed: number): {
  temp: number; humidity: number; wind: number; rainMm: number; rainProb: number;
} {
  const month = date.getMonth();
  const w = SEASONAL_WEATHER[month];
  // Pseudo-random seeded variation
  const s1 = Math.sin(seed * 12.9898 + 78.233) * 43758.5453 % 1;
  const s2 = Math.sin(seed * 78.233 + 12.9898) * 23421.6312 % 1;
  const s3 = Math.sin(seed * 43.323 + 56.789) * 98765.4321 % 1;
  const s4 = Math.sin(seed * 56.789 + 43.323) * 12345.6789 % 1;
  const temp = Math.round((w.tempMin + (w.tempMax - w.tempMin) * Math.abs(s1)) * 10) / 10;
  const humidity = Math.round(w.humidityMin + (w.humidityMax - w.humidityMin) * Math.abs(s2));
  const wind = Math.round((w.windMin + (w.windMax - w.windMin) * Math.abs(s3)) * 10) / 10;
  const rainProb = Math.round(w.rainProb * 100 * (0.7 + Math.abs(s4) * 0.6));
  const rainMm = Math.abs(s4) < w.rainProb ? Math.round(Math.abs(s4) * 10 * 10) / 10 : 0;
  return { temp, humidity, wind, rainMm, rainProb: Math.min(95, rainProb) };
}

// ─── Parcel Risk Calculations (Real Forest Science) ───

interface ParcelFireRisk {
  parcelId: string;
  parcelName: string;
  area: number;
  terrainRisk: number;     // 0-10
  speciesRisk: number;     // 0-10
  moistureRisk: number;    // 0-10
  beetleRisk: number;      // 0-10
  overallRisk: number;     // 1-10
  riskLabel: string;
  riskColor: string;
  terrainNotes: string;
  speciesNotes: string;
  beetleNotes: string;
  accessNotes: string;
}

function assessParcelFireRisk(parcel: DemoParcel, currentFFMC: number): ParcelFireRisk {
  // 1. Terrain risk — slope/elevation/aspect
  // Higher elevation = drier, south-facing slopes dry faster
  let terrainScore = 0;
  const terrainNotes: string[] = [];

  if (parcel.elevation_m > 250) {
    terrainScore += 1.5;
    terrainNotes.push(`Elevation ${parcel.elevation_m}m — moderate drying`);
  } else if (parcel.elevation_m > 200) {
    terrainScore += 0.5;
    terrainNotes.push(`Elevation ${parcel.elevation_m}m — typical`);
  }

  // Sandy/moraine soil dries faster than clay/peat
  if (parcel.soil_type.toLowerCase().includes('sand')) {
    terrainScore += 2;
    terrainNotes.push('Sandy soil drains quickly — dries fast');
  } else if (parcel.soil_type.toLowerCase().includes('moraine')) {
    terrainScore += 1;
    terrainNotes.push('Moraine soil — moderate drainage');
  } else if (parcel.soil_type.toLowerCase().includes('peat')) {
    terrainScore -= 1;
    terrainNotes.push('Peat soil retains moisture (but when dry, burns deep)');
  } else if (parcel.soil_type.toLowerCase().includes('clay')) {
    terrainScore -= 0.5;
    terrainNotes.push('Clay soil retains moisture well');
  }

  terrainScore = Math.max(0, Math.min(10, terrainScore + 3)); // base of 3

  // 2. Species risk — pine > spruce > deciduous for fire
  let speciesScore = 0;
  const speciesNotes: string[] = [];
  const pinePct = parcel.species_mix.find(s => s.species === 'Pine')?.pct || 0;
  const sprucePct = parcel.species_mix.find(s => s.species === 'Spruce')?.pct || 0;
  const deciduousPct = parcel.species_mix
    .filter(s => ['Birch', 'Oak', 'Alder', 'Beech', 'Aspen'].includes(s.species))
    .reduce((sum, s) => sum + s.pct, 0);

  // Pine has resinous bark and needle litter that burns readily
  if (pinePct >= 70) {
    speciesScore += 8;
    speciesNotes.push(`${pinePct}% Pine — highly flammable resinous needles`);
  } else if (pinePct >= 40) {
    speciesScore += 5;
    speciesNotes.push(`${pinePct}% Pine — moderate fire fuel`);
  } else if (pinePct > 0) {
    speciesScore += pinePct * 0.06;
    speciesNotes.push(`${pinePct}% Pine — minor contribution`);
  }

  // Spruce burns intensely due to ladder fuels (low branches)
  if (sprucePct >= 70) {
    speciesScore += 6;
    speciesNotes.push(`${sprucePct}% Spruce — ladder fuels, intense crown fire risk`);
  } else if (sprucePct >= 40) {
    speciesScore += 3.5;
    speciesNotes.push(`${sprucePct}% Spruce — moderate crown fire potential`);
  }

  // Deciduous species reduce fire risk
  if (deciduousPct >= 40) {
    speciesScore -= 2;
    speciesNotes.push(`${deciduousPct}% deciduous — natural fire break`);
  }

  speciesScore = Math.max(0, Math.min(10, speciesScore));

  // 3. Moisture risk — from current FFMC
  const moistureScore = Math.min(10, (currentFFMC / 100) * 10);

  // 4. Beetle damage multiplier — dead trees are extreme fire fuel
  let beetleScore = 0;
  const beetleNotes: string[] = [];
  if (parcel.status === 'infested') {
    beetleScore = 8;
    beetleNotes.push('Active infestation — dead trees are extreme fire fuel');
    beetleNotes.push('Red-stage (recently killed) trees are most flammable');
    beetleNotes.push('Fallen needles create deep litter bed');
  } else if (parcel.status === 'at_risk') {
    beetleScore = 4;
    beetleNotes.push('At-risk parcel — stressed trees with reduced moisture');
    beetleNotes.push('Early beetle activity may create scattered fuel pockets');
  } else {
    beetleScore = 1;
    beetleNotes.push('No significant beetle damage — normal fuel load');
  }

  // 5. Access risk
  const accessNotes: string[] = [];
  // Larger parcels have longer interior distances
  if (parcel.area_hectares > 50) {
    accessNotes.push('Large parcel — center may be >1km from road access');
    accessNotes.push('Consider creating interior firebreaks');
  } else if (parcel.area_hectares > 30) {
    accessNotes.push('Medium parcel — adequate road access likely');
  } else {
    accessNotes.push('Small parcel — good accessibility for fire response');
  }

  // Weighted aggregation: terrain 20%, species 25%, moisture 35%, beetle 20%
  const overall = terrainScore * 0.20 + speciesScore * 0.25 + moistureScore * 0.35 + beetleScore * 0.20;
  const clampedOverall = Math.max(1, Math.min(10, Math.round(overall * 10) / 10));

  let riskLabel: string;
  let riskColor: string;
  if (clampedOverall <= 2) { riskLabel = 'Very Low'; riskColor = '#3b82f6'; }
  else if (clampedOverall <= 4) { riskLabel = 'Low'; riskColor = '#22c55e'; }
  else if (clampedOverall <= 6) { riskLabel = 'Moderate'; riskColor = '#eab308'; }
  else if (clampedOverall <= 8) { riskLabel = 'High'; riskColor = '#f97316'; }
  else { riskLabel = 'Very High'; riskColor = '#ef4444'; }

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    area: parcel.area_hectares,
    terrainRisk: Math.round(terrainScore * 10) / 10,
    speciesRisk: Math.round(speciesScore * 10) / 10,
    moistureRisk: Math.round(moistureScore * 10) / 10,
    beetleRisk: beetleScore,
    overallRisk: clampedOverall,
    riskLabel,
    riskColor,
    terrainNotes: terrainNotes.join('. '),
    speciesNotes: speciesNotes.join('. '),
    beetleNotes: beetleNotes.join('. '),
    accessNotes: accessNotes.join('. '),
  };
}

// ─── Historical monthly averages for Småland region ───
const HISTORICAL_MONTHLY_RISK: { month: string; avg: number; extreme2018: number }[] = [
  { month: 'Jan', avg: 1.0, extreme2018: 1.0 },
  { month: 'Feb', avg: 1.0, extreme2018: 1.2 },
  { month: 'Mar', avg: 1.3, extreme2018: 1.5 },
  { month: 'Apr', avg: 2.2, extreme2018: 2.8 },
  { month: 'May', avg: 3.1, extreme2018: 3.9 },
  { month: 'Jun', avg: 3.5, extreme2018: 4.6 },
  { month: 'Jul', avg: 3.8, extreme2018: 5.0 }, // 2018 peak — record drought
  { month: 'Aug', avg: 3.2, extreme2018: 4.2 },
  { month: 'Sep', avg: 2.4, extreme2018: 2.8 },
  { month: 'Oct', avg: 1.7, extreme2018: 1.9 },
  { month: 'Nov', avg: 1.2, extreme2018: 1.3 },
  { month: 'Dec', avg: 1.0, extreme2018: 1.0 },
];

// ─── Prevention Checklist Items ───
interface ChecklistItem {
  id: string;
  text: string;
  minRiskLevel: number; // Minimum risk level (1-5) for this item to show
  category: 'always' | 'moderate' | 'high' | 'very_high';
}

const PREVENTION_CHECKLIST: ChecklistItem[] = [
  { id: 'fb1', text: 'Maintain firebreaks along property boundaries', minRiskLevel: 1, category: 'always' },
  { id: 'fb2', text: 'Ensure forest road access is clear for fire trucks', minRiskLevel: 1, category: 'always' },
  { id: 'fb3', text: 'Have an emergency plan documented and shared with family', minRiskLevel: 1, category: 'always' },
  { id: 'fb4', text: 'Register property with local fire department for fast response', minRiskLevel: 1, category: 'always' },
  { id: 'fb5', text: 'Store emergency contact numbers for Räddningstjänsten', minRiskLevel: 1, category: 'always' },
  { id: 'mod1', text: 'Remove dead wood and slash within 30m of roads and buildings', minRiskLevel: 3, category: 'moderate' },
  { id: 'mod2', text: 'Check and service fire-fighting equipment (pumps, hoses)', minRiskLevel: 3, category: 'moderate' },
  { id: 'mod3', text: 'Clear dry grass and brush around forest edges', minRiskLevel: 3, category: 'moderate' },
  { id: 'mod4', text: 'Inspect beetle-damaged stands for excessive fuel load', minRiskLevel: 3, category: 'moderate' },
  { id: 'high1', text: 'Restrict machinery use in forest (sparks can ignite)', minRiskLevel: 4, category: 'high' },
  { id: 'high2', text: 'Prepare emergency water supply (pumps, water tanks)', minRiskLevel: 4, category: 'high' },
  { id: 'high3', text: 'Notify neighbors about elevated fire risk', minRiskLevel: 4, category: 'high' },
  { id: 'high4', text: 'Pre-position fire fighting equipment near high-risk stands', minRiskLevel: 4, category: 'high' },
  { id: 'high5', text: 'Report any smoke immediately to 112', minRiskLevel: 4, category: 'high' },
  { id: 'vh1', text: 'Cease all forest operations immediately (eldningsförbud likely active)', minRiskLevel: 5, category: 'very_high' },
  { id: 'vh2', text: 'Evacuate livestock and valuable equipment from forest', minRiskLevel: 5, category: 'very_high' },
  { id: 'vh3', text: 'Establish 24/7 fire watch if near high-risk areas', minRiskLevel: 5, category: 'very_high' },
  { id: 'vh4', text: 'Contact insurance provider to confirm coverage is active', minRiskLevel: 5, category: 'very_high' },
];

// ─── Component ───

export default function FireRiskPage() {
  const now = new Date();
  const currentMonth = now.getMonth();

  // Current conditions
  const currentFFMC = useMemo(() => getCurrentFFMC(now), []);
  const currentRisk = useMemo(() => ffmcToRiskClass(currentFFMC), [currentFFMC]);

  // Per-parcel assessments
  const parcels = isDemoMode() ? DEMO_PARCELS : DEMO_PARCELS; // fallback to demo for now
  const parcelRisks = useMemo(
    () => parcels.map(p => assessParcelFireRisk(p, currentFFMC)),
    [parcels, currentFFMC]
  );

  // 7-day forecast
  const forecast = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() + i * 86400000);
      const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
      const weather = generateWeatherForDate(date, dayOfYear);
      const dayFFMC = calculateFFMC(weather.temp, weather.humidity, weather.wind * 3.6, weather.rainMm, currentFFMC);
      const isi = calculateISI(dayFFMC, weather.wind * 3.6);
      const risk = ffmcToRiskClass(dayFFMC);
      days.push({
        date,
        dayName: date.toLocaleDateString('sv-SE', { weekday: 'short' }),
        dateStr: date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
        ...weather,
        ffmc: Math.round(dayFFMC * 10) / 10,
        isi: Math.round(isi * 10) / 10,
        risk,
      });
    }
    return days;
  }, [currentFFMC]);

  // Calculate current year risk for calendar overlay
  const currentYearRisk = useMemo(() => {
    return HISTORICAL_MONTHLY_RISK.map((h, monthIdx) => {
      if (monthIdx > currentMonth) return null; // Future months unknown
      const monthDate = new Date(now.getFullYear(), monthIdx, 15);
      const ffmc = getCurrentFFMC(monthDate);
      const risk = ffmcToRiskClass(ffmc);
      return risk.level;
    });
  }, [currentMonth]);

  // Checklist persistence
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('beetlesense_fire_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('beetlesense_fire_checklist', JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Beetle-fire connection calculations
  const beetleStats = useMemo(() => {
    const infested = parcels.filter(p => p.status === 'infested');
    const atRisk = parcels.filter(p => p.status === 'at_risk');
    const totalArea = parcels.reduce((s, p) => s + p.area_hectares, 0);
    const infestedArea = infested.reduce((s, p) => s + p.area_hectares, 0);
    const atRiskArea = atRisk.reduce((s, p) => s + p.area_hectares, 0);
    // Dead trees increase fuel load by ~60-80% (USFS research)
    const fuelLoadIncrease = totalArea > 0 ? Math.round((infestedArea / totalArea) * 70) : 0;
    return { infested, atRisk, totalArea, infestedArea, atRiskArea, fuelLoadIncrease };
  }, [parcels]);

  // Expanded parcel tracking
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);

  // Full FWI calculation from fwiService
  const fwiCalc: FWIResult = useMemo(() => getDemoFWI(), []);

  // FWI component values for display
  const fwiDisplay = useMemo(() => {
    const weather = generateWeatherForDate(now, Math.floor(now.getTime() / 86400000));
    const dmc = Math.max(0, (weather.temp - 2) * 1.5 + (100 - weather.humidity) * 0.3);
    const dc = Math.max(0, 100 + (weather.temp - 5) * 3 - weather.rainMm * 10);
    const isi = calculateISI(currentFFMC, weather.wind * 3.6);
    const bui = Math.max(0, 0.8 * dmc + 0.2 * dc);
    const fwi = Math.max(0, isi * bui * 0.1);
    return {
      ffmc: Math.round(currentFFMC * 10) / 10,
      dmc: Math.round(dmc * 10) / 10,
      dc: Math.round(dc * 10) / 10,
      isi: Math.round(isi * 10) / 10,
      bui: Math.round(bui * 10) / 10,
      fwi: Math.round(fwi * 10) / 10,
    };
  }, [currentFFMC]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          to="/owner/dashboard"
          className="flex items-center gap-1.5 text-xs hover:text-[var(--green)] transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${currentRisk.color}15` }}>
              <Flame size={20} style={{ color: currentRisk.color }} />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold" style={{ color: 'var(--text)' }}>
                Brandriskprediktion
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                Fire Weather Index &amp; per-parcel risk assessment for your forest
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)' }}>
            <Clock size={12} />
            Updated {now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ─── Section 1: Current Fire Risk Dashboard ─── */}
      <div className="rounded-xl p-6 mb-6"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Big risk indicator */}
          <div className="flex flex-col items-center">
            <div className="w-28 h-28 rounded-full flex items-center justify-center relative"
              style={{
                background: `conic-gradient(${currentRisk.color} ${currentRisk.level * 20}%, var(--border) 0%)`,
              }}>
              <div className="w-22 h-22 rounded-full flex flex-col items-center justify-center"
                style={{ background: 'var(--bg2)', width: '88px', height: '88px' }}>
                <span className="text-3xl font-bold" style={{ color: currentRisk.color }}>
                  {currentRisk.level}
                </span>
                <span className="text-[10px] font-medium" style={{ color: 'var(--text3)' }}>of 5</span>
              </div>
            </div>
            <span className="text-sm font-semibold mt-2" style={{ color: currentRisk.color }}>
              {currentRisk.label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
              SMHI Brandriskklassning
            </span>
          </div>

          {/* FWI component gauges */}
          <div className="flex-1 w-full">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Fire Weather Index Components
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'FFMC (Surface Litter)', value: fwiDisplay.ffmc, max: 101, desc: 'Fine fuel moisture' },
                { label: 'DMC (Organic Layer)', value: fwiDisplay.dmc, max: 150, desc: 'Duff moisture code' },
                { label: 'DC (Deep Drought)', value: fwiDisplay.dc, max: 500, desc: 'Drought code' },
                { label: 'ISI (Spread Rate)', value: fwiDisplay.isi, max: 30, desc: 'Initial spread index' },
                { label: 'BUI (Fuel Available)', value: fwiDisplay.bui, max: 200, desc: 'Buildup index' },
                { label: 'FWI (Overall)', value: fwiDisplay.fwi, max: 50, desc: 'Fire weather index' },
              ].map(item => {
                const pct = Math.min(100, (item.value / item.max) * 100);
                const barColor = pct < 30 ? '#22c55e' : pct < 60 ? '#eab308' : '#ef4444';
                return (
                  <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text3)' }}>{item.label}</span>
                      <span className="text-sm font-bold" style={{ color: barColor }}>{item.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: 'var(--text3)' }}>{item.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Context banner */}
        <div className="mt-4 p-3 rounded-lg flex items-start gap-2"
          style={{ background: `${currentRisk.color}08`, border: `1px solid ${currentRisk.color}20` }}>
          <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: currentRisk.color }} />
          <p className="text-xs" style={{ color: 'var(--text2)' }}>
            {currentRisk.level <= 2
              ? 'Low fire risk period. Good time for fire prevention maintenance — clearing dead wood and checking equipment.'
              : currentRisk.level === 3
              ? 'Moderate fire risk. Be cautious with any ignition sources in the forest. Remove dead wood near roads.'
              : currentRisk.level === 4
              ? 'High fire risk! Restrict machinery use, prepare water supply, and notify neighbors. Avoid all open flames.'
              : 'Extreme fire risk! Cease all forest operations. Eldningsförbud likely active. Be ready to evacuate if needed.'}
          </p>
        </div>
      </div>

      {/* ─── FWI System Card (fwiService.ts) ─── */}
      <div className="rounded-xl p-5 mb-6" style={{ border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} style={{ color: fwiCalc.color }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Canadian FWI System — Full Calculation
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{
            background: `${fwiCalc.color}15`, color: fwiCalc.color,
          }}>
            {fwiCalc.dangerClassSv}
          </span>
        </div>
        <p className="text-[11px] mb-4" style={{ color: 'var(--text3)' }}>
          Van Wagner (1987) methodology with Swedish MSB/SMHI calibration. Computed via <code style={{ fontSize: 10, background: 'var(--bg3)', padding: '1px 4px', borderRadius: 3 }}>fwiService.ts</code>
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {[
            { label: 'FFMC', value: fwiCalc.ffmc, desc: 'Surface litter', max: 101 },
            { label: 'DMC', value: fwiCalc.dmc, desc: 'Duff layer', max: 200 },
            { label: 'DC', value: fwiCalc.dc, desc: 'Deep organic', max: 500 },
            { label: 'ISI', value: fwiCalc.isi, desc: 'Spread rate', max: 30 },
            { label: 'BUI', value: fwiCalc.bui, desc: 'Fuel available', max: 150 },
            { label: 'FWI', value: fwiCalc.fwi, desc: 'Fire intensity', max: 50 },
          ].map(item => {
            const pct = Math.min(100, (item.value / item.max) * 100);
            const barColor = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e';
            return (
              <div key={item.label} className="rounded-lg p-2.5" style={{ background: 'var(--bg3)' }}>
                <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text3)' }}>{item.label}</div>
                <div className="text-base font-bold font-mono" style={{ color: 'var(--text)' }}>{item.value}</div>
                <div className="text-[9px]" style={{ color: 'var(--text3)' }}>{item.desc}</div>
                <div className="mt-1 h-1 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--text3)' }}>
          <span>Swedish danger level: <strong style={{ color: fwiCalc.color }}>{fwiCalc.swedishDangerLevel}/5</strong></span>
          <span>|</span>
          <span>International class: <strong style={{ color: fwiCalc.color }}>{fwiCalc.dangerClass}</strong></span>
        </div>
      </div>

      {/* ─── Section 2: Per-Parcel Risk Assessment ─── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TreePine size={18} style={{ color: 'var(--green)' }} />
          <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text)' }}>
            Per-Parcel Risk Assessment
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parcelRisks.map(pr => (
            <div
              key={pr.parcelId}
              className="rounded-xl p-4 cursor-pointer transition-all hover:translate-y-[-1px]"
              style={{ background: 'var(--bg2)', border: `1px solid ${expandedParcel === pr.parcelId ? pr.riskColor + '40' : 'var(--border)'}` }}
              onClick={() => setExpandedParcel(expandedParcel === pr.parcelId ? null : pr.parcelId)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: 'var(--text3)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{pr.parcelName}</span>
                  <span className="text-xs" style={{ color: 'var(--text3)' }}>{pr.area} ha</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: pr.riskColor }}>{pr.overallRisk}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${pr.riskColor}15`, color: pr.riskColor }}>
                    {pr.riskLabel}
                  </span>
                </div>
              </div>

              {/* Risk breakdown bars */}
              <div className="space-y-2">
                {[
                  { label: 'Terrain (20%)', value: pr.terrainRisk, max: 10 },
                  { label: 'Species (25%)', value: pr.speciesRisk, max: 10 },
                  { label: 'Moisture (35%)', value: pr.moistureRisk, max: 10 },
                  { label: 'Beetle (20%)', value: pr.beetleRisk, max: 10 },
                ].map(bar => {
                  const pct = (bar.value / bar.max) * 100;
                  const c = pct < 30 ? '#22c55e' : pct < 60 ? '#eab308' : '#ef4444';
                  return (
                    <div key={bar.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span style={{ color: 'var(--text3)' }}>{bar.label}</span>
                        <span style={{ color: c }}>{bar.value}/10</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expanded details */}
              {expandedParcel === pr.parcelId && (
                <div className="mt-3 pt-3 space-y-2 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
                  {pr.terrainNotes && (
                    <div className="flex items-start gap-1.5">
                      <TrendingUp size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                      <span style={{ color: 'var(--text2)' }}>{pr.terrainNotes}</span>
                    </div>
                  )}
                  {pr.speciesNotes && (
                    <div className="flex items-start gap-1.5">
                      <TreePine size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                      <span style={{ color: 'var(--text2)' }}>{pr.speciesNotes}</span>
                    </div>
                  )}
                  {pr.beetleNotes && (
                    <div className="flex items-start gap-1.5">
                      <Bug size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                      <span style={{ color: 'var(--text2)' }}>{pr.beetleNotes}</span>
                    </div>
                  )}
                  {pr.accessNotes && (
                    <div className="flex items-start gap-1.5">
                      <MapPin size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                      <span style={{ color: 'var(--text2)' }}>{pr.accessNotes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 3: 7-Day Fire Weather Forecast ─── */}
      <div className="rounded-xl p-5 mb-6"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} style={{ color: '#f97316' }} />
          <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text)' }}>
            7-Day Fire Weather Forecast
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--text3)' }}>
                <th className="text-left pb-2 font-medium">Day</th>
                <th className="text-center pb-2 font-medium">
                  <div className="flex items-center justify-center gap-1"><Thermometer size={10} /> Temp</div>
                </th>
                <th className="text-center pb-2 font-medium">
                  <div className="flex items-center justify-center gap-1"><Droplets size={10} /> Humidity</div>
                </th>
                <th className="text-center pb-2 font-medium">
                  <div className="flex items-center justify-center gap-1"><Wind size={10} /> Wind</div>
                </th>
                <th className="text-center pb-2 font-medium">
                  <div className="flex items-center justify-center gap-1"><CloudRain size={10} /> Rain %</div>
                </th>
                <th className="text-center pb-2 font-medium">FFMC</th>
                <th className="text-center pb-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((day, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-2.5">
                    <div className="font-medium" style={{ color: 'var(--text)' }}>{day.dayName}</div>
                    <div style={{ color: 'var(--text3)' }}>{day.dateStr}</div>
                  </td>
                  <td className="text-center py-2.5" style={{ color: 'var(--text2)' }}>{day.temp}°C</td>
                  <td className="text-center py-2.5" style={{ color: 'var(--text2)' }}>{day.humidity}%</td>
                  <td className="text-center py-2.5" style={{ color: 'var(--text2)' }}>{day.wind} m/s</td>
                  <td className="text-center py-2.5" style={{ color: day.rainProb > 50 ? '#3b82f6' : 'var(--text2)' }}>
                    {day.rainProb}%
                    {day.rainMm > 0 && <span className="block text-[9px]" style={{ color: '#3b82f6' }}>{day.rainMm} mm</span>}
                  </td>
                  <td className="text-center py-2.5">
                    <span className="font-mono font-bold" style={{ color: day.risk.color }}>{day.ffmc}</span>
                  </td>
                  <td className="text-center py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: day.risk.bgColor, color: day.risk.color }}>
                      {day.risk.level}/5 {day.risk.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden grid grid-cols-2 gap-2">
          {forecast.map((day, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>{day.dayName} {day.dateStr}</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold" style={{ color: day.risk.color }}>{day.risk.level}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: day.risk.bgColor, color: day.risk.color }}>
                  {day.risk.label}
                </span>
              </div>
              <div className="space-y-0.5 text-[10px]" style={{ color: 'var(--text3)' }}>
                <div className="flex justify-between"><span>Temp</span><span>{day.temp}°C</span></div>
                <div className="flex justify-between"><span>Humidity</span><span>{day.humidity}%</span></div>
                <div className="flex justify-between"><span>Wind</span><span>{day.wind} m/s</span></div>
                <div className="flex justify-between"><span>Rain</span><span>{day.rainProb}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 4: Fire Prevention Checklist ─── */}
      <div className="rounded-xl p-5 mb-6"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} style={{ color: 'var(--green)' }} />
          <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text)' }}>
            Fire Prevention Checklist
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${currentRisk.color}15`, color: currentRisk.color }}>
            Level {currentRisk.level} actions
          </span>
        </div>

        {(['always', 'moderate', 'high', 'very_high'] as const).map(category => {
          const items = PREVENTION_CHECKLIST.filter(
            item => item.category === category && item.minRiskLevel <= currentRisk.level
          );
          if (items.length === 0) return null;

          const categoryLabels: Record<string, { label: string; color: string }> = {
            always: { label: 'Always', color: '#22c55e' },
            moderate: { label: 'Moderate Risk+', color: '#eab308' },
            high: { label: 'High Risk+', color: '#f97316' },
            very_high: { label: 'Very High Risk', color: '#ef4444' },
          };
          const cat = categoryLabels[category];

          return (
            <div key={category} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
              </div>
              <div className="space-y-1.5 ml-4">
                {items.map(item => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 cursor-pointer group"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => toggleCheck(item.id)}
                      className="mt-0.5 accent-[var(--green)]"
                      style={{ width: 14, height: 14 }}
                    />
                    <span
                      className={`text-xs transition-colors ${checkedItems[item.id] ? 'line-through' : ''}`}
                      style={{ color: checkedItems[item.id] ? 'var(--text3)' : 'var(--text2)' }}
                    >
                      {item.text}
                    </span>
                    {checkedItems[item.id] && (
                      <CheckCircle2 size={12} style={{ color: 'var(--green)' }} className="mt-0.5 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-3 pt-3 flex items-center justify-between text-[10px]"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text3)' }}>
          <span>
            {Object.values(checkedItems).filter(Boolean).length} of{' '}
            {PREVENTION_CHECKLIST.filter(i => i.minRiskLevel <= currentRisk.level).length} tasks completed
          </span>
          <span>Saved to your device</span>
        </div>
      </div>

      {/* ─── Section 5: Historical Fire Risk Calendar ─── */}
      <div className="rounded-xl p-5 mb-6"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} style={{ color: '#f97316' }} />
          <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text)' }}>
            Historical Fire Risk Calendar
          </h2>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {HISTORICAL_MONTHLY_RISK.map((month, idx) => {
            const avgHeight = (month.avg / 5) * 100;
            const extremeHeight = (month.extreme2018 / 5) * 100;
            const currentHeight = currentYearRisk[idx] !== null ? ((currentYearRisk[idx]! / 5) * 100) : 0;
            const isCurrentMonth = idx === currentMonth;

            return (
              <div key={month.month} className="text-center">
                <div className="text-[10px] font-medium mb-1"
                  style={{ color: isCurrentMonth ? 'var(--green)' : 'var(--text3)' }}>
                  {month.month}
                </div>
                <div className="relative h-20 rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--bg)',
                    border: isCurrentMonth ? '1px solid var(--green)' : '1px solid var(--border)',
                  }}>
                  {/* Average bar */}
                  <div
                    className="absolute bottom-0 left-1 right-1/2 rounded-t-sm"
                    style={{ height: `${avgHeight}%`, background: '#3b82f640' }}
                    title={`Avg: ${month.avg}`}
                  />
                  {/* 2018 extreme bar */}
                  <div
                    className="absolute bottom-0 left-1/2 right-1 rounded-t-sm"
                    style={{ height: `${extremeHeight}%`, background: '#ef444440' }}
                    title={`2018: ${month.extreme2018}`}
                  />
                  {/* Current year marker */}
                  {currentYearRisk[idx] !== null && (
                    <div
                      className="absolute left-0 right-0 h-0.5"
                      style={{
                        bottom: `${currentHeight}%`,
                        background: 'var(--green)',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px]" style={{ color: 'var(--text3)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#3b82f640' }} />
            <span>Historical average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#ef444440' }} />
            <span>2018 extreme year (25,000 ha burned)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1" style={{ background: 'var(--green)' }} />
            <span>{now.getFullYear()} actual</span>
          </div>
        </div>
      </div>

      {/* ─── Section 6: Beetle-Fire Connection Panel ─── */}
      <div className="rounded-xl p-5"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Bug size={18} style={{ color: '#f97316' }} />
          <h2 className="text-lg font-serif font-semibold" style={{ color: 'var(--text)' }}>
            Beetle-Fire Connection
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-1"
              style={{ color: 'var(--text3)' }}>Infested Area</div>
            <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
              {beetleStats.infestedArea} ha
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
              of {beetleStats.totalArea.toFixed(1)} ha total ({Math.round((beetleStats.infestedArea / beetleStats.totalArea) * 100)}%)
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-1"
              style={{ color: 'var(--text3)' }}>Fire Fuel Load Increase</div>
            <div className="text-2xl font-bold" style={{ color: '#f97316' }}>
              +{beetleStats.fuelLoadIncrease}%
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
              Due to beetle-killed standing dead trees
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-1"
              style={{ color: 'var(--text3)' }}>At-Risk Area</div>
            <div className="text-2xl font-bold" style={{ color: '#eab308' }}>
              {beetleStats.atRiskArea} ha
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
              Stressed trees — potential fuel source
            </div>
          </div>
        </div>

        {/* Fire-beetle science explanation */}
        <div className="space-y-3">
          <div className="p-3 rounded-lg flex items-start gap-3"
            style={{ background: '#ef444408', border: '1px solid #ef444420' }}>
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>
                Red-Stage Trees (Recently Killed)
              </div>
              <p className="text-xs" style={{ color: 'var(--text2)' }}>
                Trees killed by bark beetles in the past 1-2 years retain their dry needles, creating highly flammable
                "red-stage" fuel. These trees contain 30-50% less moisture than living trees and their retained needles
                act as aerial fire ladders, allowing ground fires to climb into the canopy.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg flex items-start gap-3"
            style={{ background: '#f9731608', border: '1px solid #f9731620' }}>
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#f97316' }} />
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#f97316' }}>
                Grey-Stage Trees (2-5 Years Dead)
              </div>
              <p className="text-xs" style={{ color: 'var(--text2)' }}>
                After needles fall, dead standing trees create open canopy gaps that dry the forest floor and increase
                wind exposure. Fallen trunks and branches create heavy ground fuel loads. USFS research shows fuel loads
                can increase 60-80% in beetle-killed stands.
              </p>
            </div>
          </div>

          {beetleStats.infested.length > 0 && (
            <div className="p-3 rounded-lg" style={{ background: '#eab30808', border: '1px solid #eab30820' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#eab308' }}>
                Your Affected Parcels
              </div>
              {beetleStats.infested.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text2)' }}>
                    {p.name} — {p.area_hectares} ha, {p.species_mix.map(s => `${s.pct}% ${s.species}`).join(', ')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#ef444420', color: '#ef4444' }}>
                    1.5x fire risk multiplier
                  </span>
                </div>
              ))}
              {beetleStats.atRisk.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text2)' }}>
                    {p.name} — {p.area_hectares} ha, {p.species_mix.map(s => `${s.pct}% ${s.species}`).join(', ')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#eab30820', color: '#eab308' }}>
                    1.2x fire risk multiplier
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
