/**
 * useMillDemand — Mill demand intelligence hook for BeetleSense.
 *
 * Provides data on major Swedish mills: locations, capacity, utilization,
 * demand signals, price opportunities, and transport cost estimates.
 * In demo mode returns hardcoded real Swedish mill data.
 */

import { useState, useEffect, useMemo } from 'react';
import { DEMO_PARCELS } from '@/lib/demoData';

// ─── Types ───

export type MillType = 'sawmill' | 'pulp' | 'board' | 'energy' | 'furniture';
export type DemandLevel = 'high' | 'normal' | 'low';
export type DemandTrend = 'increasing' | 'stable' | 'decreasing';

export interface Assortment {
  name: string;
  nameEn: string;
  currentPrice: number; // SEK/m³ or SEK/tonne
  unit: 'm³fub' | 'tonne';
  demandLevel: DemandLevel;
}

export interface Mill {
  id: string;
  name: string;
  company: string;
  type: MillType[];
  location: { lat: number; lng: number };
  municipality: string;
  region: string;
  annualCapacity: number;
  capacityUnit: 'm³' | 'tonnes';
  utilization: number; // 0–100
  demandLevel: DemandLevel;
  demandTrend: DemandTrend;
  assortments: Assortment[];
  contactEmail: string;
  contactPhone: string;
}

export interface MillWithDistance extends Mill {
  distanceKm: number;
  nearestParcel: string;
  transportCostSEK: number; // per m³
}

export interface HotMarket {
  millName: string;
  millId: string;
  assortment: string;
  price: number;
  unit: string;
  demandLevel: DemandLevel;
  reason: string;
}

export interface IndustryTrend {
  id: string;
  text: string;
  impact: 'positive' | 'negative' | 'neutral';
  date: string;
}

export interface RegionBalance {
  region: string;
  supplyLevel: number; // 0–100
  demandLevel: number; // 0–100
  balance: 'surplus' | 'balanced' | 'deficit';
}

export interface NegotiationBrief {
  millId: string;
  millName: string;
  assortment: string;
  buyerPosition: string;
  buyerBATNA: string;
  yourLeverage: string[];
  fairPriceRange: { low: number; mid: number; high: number; unit: string };
  competingOffers: { mill: string; price: number }[];
  timingAdvice: string;
  talkingPoints: string[];
  buyerNeedsYouMore: boolean;
}

// ─── Demo mills (real Swedish mills) ───

const DEMO_MILLS: Mill[] = [
  {
    id: 'mill-1',
    name: 'Ala sågverk',
    company: 'Stora Enso',
    type: ['sawmill'],
    location: { lat: 61.03, lng: 14.88 },
    municipality: 'Leksand',
    region: 'Dalarna',
    annualCapacity: 450000,
    capacityUnit: 'm³',
    utilization: 87,
    demandLevel: 'high',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 650, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 620, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'ala.sagverk@storaenso.com',
    contactPhone: '+46 247 440 00',
  },
  {
    id: 'mill-2',
    name: 'Skutskär bruk',
    company: 'Stora Enso',
    type: ['pulp'],
    location: { lat: 60.64, lng: 17.41 },
    municipality: 'Älvkarleby',
    region: 'Gävleborg',
    annualCapacity: 750000,
    capacityUnit: 'tonnes',
    utilization: 92,
    demandLevel: 'high',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Granmassaved', nameEn: 'Spruce pulpwood', currentPrice: 340, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Björkmassaved', nameEn: 'Birch pulpwood', currentPrice: 310, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'skutskar@storaenso.com',
    contactPhone: '+46 26 825 00',
  },
  {
    id: 'mill-3',
    name: 'Värö bruk',
    company: 'Södra',
    type: ['pulp'],
    location: { lat: 57.11, lng: 12.25 },
    municipality: 'Varberg',
    region: 'Halland',
    annualCapacity: 700000,
    capacityUnit: 'tonnes',
    utilization: 78,
    demandLevel: 'normal',
    demandTrend: 'stable',
    assortments: [
      { name: 'Granmassaved', nameEn: 'Spruce pulpwood', currentPrice: 330, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Tallmassaved', nameEn: 'Pine pulpwood', currentPrice: 315, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Lövmassaved', nameEn: 'Hardwood pulpwood', currentPrice: 295, unit: 'm³fub', demandLevel: 'low' },
    ],
    contactEmail: 'varo@sodra.com',
    contactPhone: '+46 340 63 50 00',
  },
  {
    id: 'mill-4',
    name: 'Tunadal sågverk',
    company: 'SCA',
    type: ['sawmill'],
    location: { lat: 62.42, lng: 17.28 },
    municipality: 'Sundsvall',
    region: 'Västernorrland',
    annualCapacity: 550000,
    capacityUnit: 'm³',
    utilization: 83,
    demandLevel: 'high',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 670, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 640, unit: 'm³fub', demandLevel: 'high' },
    ],
    contactEmail: 'tunadal@sca.com',
    contactPhone: '+46 60 19 30 00',
  },
  {
    id: 'mill-5',
    name: 'Iggesund bruk',
    company: 'Holmen',
    type: ['board'],
    location: { lat: 61.64, lng: 17.08 },
    municipality: 'Hudiksvall',
    region: 'Gävleborg',
    annualCapacity: 330000,
    capacityUnit: 'tonnes',
    utilization: 91,
    demandLevel: 'high',
    demandTrend: 'stable',
    assortments: [
      { name: 'Granmassaved', nameEn: 'Spruce pulpwood', currentPrice: 350, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Björkmassaved', nameEn: 'Birch pulpwood', currentPrice: 320, unit: 'm³fub', demandLevel: 'high' },
    ],
    contactEmail: 'iggesund@holmen.com',
    contactPhone: '+46 650 280 00',
  },
  {
    id: 'mill-6',
    name: 'Hasselfors sågverk',
    company: 'Setra',
    type: ['sawmill'],
    location: { lat: 59.03, lng: 14.58 },
    municipality: 'Laxå',
    region: 'Örebro',
    annualCapacity: 250000,
    capacityUnit: 'm³',
    utilization: 72,
    demandLevel: 'normal',
    demandTrend: 'stable',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 610, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 590, unit: 'm³fub', demandLevel: 'low' },
    ],
    contactEmail: 'hasselfors@setragroup.se',
    contactPhone: '+46 584 47 00 00',
  },
  {
    id: 'mill-7',
    name: 'Alvesta sågverk',
    company: 'Vida',
    type: ['sawmill'],
    location: { lat: 56.90, lng: 14.55 },
    municipality: 'Alvesta',
    region: 'Kronoberg',
    annualCapacity: 350000,
    capacityUnit: 'm³',
    utilization: 89,
    demandLevel: 'high',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 660, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 630, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'alvesta@vida.se',
    contactPhone: '+46 472 440 00',
  },
  {
    id: 'mill-8',
    name: 'Valåsen sågverk',
    company: 'Moelven',
    type: ['sawmill'],
    location: { lat: 59.64, lng: 13.17 },
    municipality: 'Karlstad',
    region: 'Värmland',
    annualCapacity: 240000,
    capacityUnit: 'm³',
    utilization: 68,
    demandLevel: 'low',
    demandTrend: 'decreasing',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 580, unit: 'm³fub', demandLevel: 'low' },
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 560, unit: 'm³fub', demandLevel: 'low' },
    ],
    contactEmail: 'valasen@moelven.se',
    contactPhone: '+46 54 53 51 00',
  },
  {
    id: 'mill-9',
    name: 'Hultsfred fabrik',
    company: 'IKEA Industry',
    type: ['board', 'furniture'],
    location: { lat: 57.49, lng: 15.85 },
    municipality: 'Hultsfred',
    region: 'Kalmar',
    annualCapacity: 200000,
    capacityUnit: 'm³',
    utilization: 94,
    demandLevel: 'high',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 640, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Björkstock', nameEn: 'Birch sawlog', currentPrice: 580, unit: 'm³fub', demandLevel: 'high' },
      { name: 'Granmassaved', nameEn: 'Spruce pulpwood', currentPrice: 310, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'hultsfred@ikeaindustry.com',
    contactPhone: '+46 495 24 00 00',
  },
  {
    id: 'mill-10',
    name: 'Sveaskog Norrbotten',
    company: 'Sveaskog',
    type: ['sawmill', 'energy'],
    location: { lat: 65.58, lng: 22.15 },
    municipality: 'Luleå',
    region: 'Norrbotten',
    annualCapacity: 180000,
    capacityUnit: 'm³',
    utilization: 61,
    demandLevel: 'low',
    demandTrend: 'stable',
    assortments: [
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 550, unit: 'm³fub', demandLevel: 'low' },
      { name: 'Energived', nameEn: 'Energy wood', currentPrice: 220, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'norrbotten@sveaskog.se',
    contactPhone: '+46 920 20 85 00',
  },
  {
    id: 'mill-11',
    name: 'Mönsterås bruk',
    company: 'Södra',
    type: ['pulp'],
    location: { lat: 57.04, lng: 16.44 },
    municipality: 'Mönsterås',
    region: 'Kalmar',
    annualCapacity: 750000,
    capacityUnit: 'tonnes',
    utilization: 85,
    demandLevel: 'normal',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Granmassaved', nameEn: 'Spruce pulpwood', currentPrice: 335, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Tallmassaved', nameEn: 'Pine pulpwood', currentPrice: 310, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'monsteras@sodra.com',
    contactPhone: '+46 499 17 00 00',
  },
  {
    id: 'mill-12',
    name: 'Gruvön bruk',
    company: 'BillerudKorsnäs',
    type: ['pulp', 'board'],
    location: { lat: 59.35, lng: 13.11 },
    municipality: 'Grums',
    region: 'Värmland',
    annualCapacity: 680000,
    capacityUnit: 'tonnes',
    utilization: 76,
    demandLevel: 'normal',
    demandTrend: 'stable',
    assortments: [
      { name: 'Granmassaved', nameEn: 'Spruce pulpwood', currentPrice: 325, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Tallmassaved', nameEn: 'Pine pulpwood', currentPrice: 305, unit: 'm³fub', demandLevel: 'low' },
    ],
    contactEmail: 'gruvon@billerudkorsnas.com',
    contactPhone: '+46 555 410 00',
  },
  {
    id: 'mill-13',
    name: 'Nybro sågverk',
    company: 'Vida',
    type: ['sawmill'],
    location: { lat: 56.74, lng: 15.91 },
    municipality: 'Nybro',
    region: 'Kalmar',
    annualCapacity: 300000,
    capacityUnit: 'm³',
    utilization: 82,
    demandLevel: 'normal',
    demandTrend: 'increasing',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 640, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Tallstock', nameEn: 'Pine sawlog', currentPrice: 615, unit: 'm³fub', demandLevel: 'normal' },
    ],
    contactEmail: 'nybro@vida.se',
    contactPhone: '+46 481 450 00',
  },
  {
    id: 'mill-14',
    name: 'Orrefors sågverk',
    company: 'Vida',
    type: ['sawmill', 'energy'],
    location: { lat: 56.95, lng: 15.42 },
    municipality: 'Nybro',
    region: 'Kalmar',
    annualCapacity: 280000,
    capacityUnit: 'm³',
    utilization: 74,
    demandLevel: 'normal',
    demandTrend: 'stable',
    assortments: [
      { name: 'Granstock', nameEn: 'Spruce sawlog', currentPrice: 625, unit: 'm³fub', demandLevel: 'normal' },
      { name: 'Energived', nameEn: 'Energy wood', currentPrice: 230, unit: 'm³fub', demandLevel: 'high' },
    ],
    contactEmail: 'orrefors@vida.se',
    contactPhone: '+46 481 340 00',
  },
];

// ─── Demo trends ───

const DEMO_TRENDS: IndustryTrend[] = [
  {
    id: 't1',
    text: 'Sågverken i Småland ökar produktion Q2 — granpriset stiger',
    impact: 'positive',
    date: '2026-03-15',
  },
  {
    id: 't2',
    text: 'Kina-exporten av sågat virke +12% Q1 → tryck uppåt på tallstockspriser',
    impact: 'positive',
    date: '2026-03-12',
  },
  {
    id: 't3',
    text: 'Södras massabruk planerar underhållsstopp maj — minskad efterfrågan massaved 3 veckor',
    impact: 'negative',
    date: '2026-03-10',
  },
  {
    id: 't4',
    text: 'EU:s gröna taxonomi driver efterfrågan på FSC-certifierat virke (+8% premium)',
    impact: 'positive',
    date: '2026-03-08',
  },
  {
    id: 't5',
    text: 'Bostadsbyggandet i Sverige ökar — Boverket höjer prognos till 67 000 nya bostäder 2026',
    impact: 'positive',
    date: '2026-03-05',
  },
  {
    id: 't6',
    text: 'Moelven Valåsen drar ned skift p.g.a. vikande efterfrågan på konstruktionsvirke',
    impact: 'negative',
    date: '2026-03-02',
  },
  {
    id: 't7',
    text: 'Energivedspriset stiger 15% — stor efterfrågan inför fjärrvärmesäsong',
    impact: 'positive',
    date: '2026-02-28',
  },
];

// ─── Region balance ───

const DEMO_REGION_BALANCES: RegionBalance[] = [
  { region: 'Götaland', supplyLevel: 55, demandLevel: 80, balance: 'deficit' },
  { region: 'Svealand', supplyLevel: 65, demandLevel: 60, balance: 'balanced' },
  { region: 'Norrland', supplyLevel: 75, demandLevel: 50, balance: 'surplus' },
];

// ─── Haversine distance helper ───

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Hook ───

export interface UseMillDemandReturn {
  mills: MillWithDistance[];
  hotMarkets: HotMarket[];
  trends: IndustryTrend[];
  regionBalances: RegionBalance[];
  isLoading: boolean;
  getNegotiationBrief: (millId: string, assortment: string) => NegotiationBrief | null;
}

export function useMillDemand(): UseMillDemandReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [mills, setMills] = useState<MillWithDistance[]>([]);
  const [hotMarkets, setHotMarkets] = useState<HotMarket[]>([]);
  const [trends, setTrends] = useState<IndustryTrend[]>([]);
  const [regionBalances, setRegionBalances] = useState<RegionBalance[]>([]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      const parcels = DEMO_PARCELS;

      // Compute distance from each mill to nearest parcel
      const millsWithDist: MillWithDistance[] = DEMO_MILLS.map((mill) => {
        let minDist = Infinity;
        let nearestName = '';
        for (const p of parcels) {
          const d = haversineKm(mill.location.lat, mill.location.lng, p.center[1], p.center[0]);
          if (d < minDist) {
            minDist = d;
            nearestName = p.name;
          }
        }
        // Road distance ~1.3x straight line; transport cost ~3.5 SEK/m³/10km
        const roadDist = Math.round(minDist * 1.3);
        const transportCost = Math.round(roadDist * 0.35);
        return {
          ...mill,
          distanceKm: roadDist,
          nearestParcel: nearestName,
          transportCostSEK: transportCost,
        };
      });

      // Build hot markets — top combinations of high demand + good price
      const hot: HotMarket[] = [];
      for (const m of millsWithDist) {
        for (const a of m.assortments) {
          if (a.demandLevel === 'high') {
            hot.push({
              millName: `${m.company} ${m.name}`,
              millId: m.id,
              assortment: a.name,
              price: a.currentPrice,
              unit: a.unit,
              demandLevel: a.demandLevel,
              reason:
                m.utilization >= 85
                  ? `Kapacitetsutnyttjande ${m.utilization}% — behöver råvara nu`
                  : `Ökande produktion — ${m.demandTrend === 'increasing' ? 'stigande trend' : 'stabil efterfrågan'}`,
            });
          }
        }
      }
      hot.sort((a, b) => b.price - a.price);

      setMills(millsWithDist);
      setHotMarkets(hot.slice(0, 6));
      setTrends(DEMO_TRENDS);
      setRegionBalances(DEMO_REGION_BALANCES);
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const getNegotiationBrief = useMemo(() => {
    return (millId: string, assortment: string): NegotiationBrief | null => {
      const mill = mills.find((m) => m.id === millId);
      if (!mill) return null;

      const assortObj = mill.assortments.find((a) => a.name === assortment);
      if (!assortObj) return null;

      const isDesperateForSupply = mill.utilization >= 85 && mill.demandLevel === 'high';
      const basePrice = assortObj.currentPrice;

      // Find competing mills for same assortment
      const competing = mills
        .filter((m) => m.id !== millId && m.assortments.some((a) => a.name === assortment))
        .sort((a, b) => {
          const aPrice = a.assortments.find((x) => x.name === assortment)?.currentPrice ?? 0;
          const bPrice = b.assortments.find((x) => x.name === assortment)?.currentPrice ?? 0;
          return bPrice - aPrice;
        })
        .slice(0, 3)
        .map((m) => ({
          mill: `${m.company} ${m.name}`,
          price: m.assortments.find((x) => x.name === assortment)?.currentPrice ?? 0,
        }));

      const leverage: string[] = [];
      if (isDesperateForSupply) {
        leverage.push(`${mill.name} har ${mill.utilization}% kapacitetsutnyttjande — de BEHÖVER råvara`);
      }
      if (mill.demandTrend === 'increasing') {
        leverage.push('Efterfrågan stiger — du har tidsfördel att vänta');
      }
      if (competing.length > 0 && competing[0].price >= basePrice) {
        leverage.push(`${competing[0].mill} betalar ${competing[0].price} SEK — använd som referens`);
      }
      leverage.push('Du har FSC-certifierat virke — premiumargument');
      leverage.push('Kort avverkningstid — du kan leverera snabbt vid behov');

      const talkingPoints: string[] = [
        `"Jag har fått indikationer från ${competing[0]?.mill ?? 'andra köpare'} på ${competing[0]?.price ?? basePrice + 20} SEK/${assortObj.unit}."`,
        `"Vi kan leverera ${isDesperateForSupply ? 'omgående' : 'inom 4 veckor'} om priset är rätt."`,
        `"Mitt virke är FSC-certifierat och av hög kvalitet — det förtjänar ett premium."`,
        `"Jag vill ha ett långsiktigt samarbete, men priset måste spegla marknadsvärdet."`,
        isDesperateForSupply
          ? `"Jag vet att ni kör nära full kapacitet. Bra timing för oss båda om priset stämmer."`
          : `"Jag är inte brådskande — jag kan vänta tills marknaden ger rätt pris."`,
      ];

      let timingAdvice: string;
      if (isDesperateForSupply) {
        timingAdvice = 'Kontakta NU — bruket kör nära maxkapacitet och behöver virke. Bästa förhandlingsläget.';
      } else if (mill.demandTrend === 'increasing') {
        timingAdvice = 'Vänta 2–3 veckor — trenden pekar uppåt. Bättre pris troligt.';
      } else if (mill.demandTrend === 'decreasing') {
        timingAdvice = 'Kontakta snarast — efterfrågan sjunker. Bättre att säkra pris nu.';
      } else {
        timingAdvice = 'Kontakta efter kvartalsrapport — ny budget kan ge utrymme för bättre pris.';
      }

      return {
        millId,
        millName: `${mill.company} ${mill.name}`,
        assortment,
        buyerPosition: isDesperateForSupply
          ? 'Köparen har svag position — hög efterfrågan tvingar dem att konkurrera om råvara.'
          : 'Köparen har normal position — standardvillkor gäller men förhandlingsutrymme finns.',
        buyerBATNA: isDesperateForSupply
          ? 'Alternativet för köparen: importvirke till högre kostnad eller produktionsminskning.'
          : 'Alternativet: köpa från andra skogsägare i regionen till liknande pris.',
        yourLeverage: leverage,
        fairPriceRange: {
          low: Math.round(basePrice * 0.95),
          mid: basePrice,
          high: Math.round(basePrice * (isDesperateForSupply ? 1.12 : 1.06)),
          unit: assortObj.unit,
        },
        competingOffers: competing,
        timingAdvice,
        talkingPoints,
        buyerNeedsYouMore: isDesperateForSupply,
      };
    };
  }, [mills]);

  return {
    mills,
    hotMarkets,
    trends,
    regionBalances,
    isLoading,
    getNegotiationBrief,
  };
}
