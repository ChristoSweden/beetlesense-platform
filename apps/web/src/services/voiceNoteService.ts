/**
 * Voice Note Transcription Service
 *
 * Hands-free field observations via voice. Transcripts are analyzed
 * for keywords to auto-classify observation type and severity.
 *
 * Persistence: localStorage in demo mode.
 */

import type { ObservationType, Severity } from './observationService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedObservation {
  type: ObservationType;
  severity: Severity;
  species?: string;
  count?: number;
  keywords: string[];
}

export interface VoiceNote {
  id: string;
  userId: string;
  recordedAt: number;
  durationSeconds: number;
  lat: number;
  lng: number;
  transcript: string;
  extractedObservation?: ExtractedObservation;
  linkedObservationId?: string;
  parcelId?: string;
}

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'beetlesense-voice-notes';

function loadNotes(): VoiceNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: VoiceNote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function generateId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgo(n: number): number {
  return Date.now() - n * 86400000;
}

// ── Keyword Extraction Logic ────────────────────────────────────────────────

const KEYWORD_MAP: [RegExp, ObservationType][] = [
  [/barkborr|bore dust|borrstoft|beetle|bark beetle/i, 'beetle_bore_dust'],
  [/entry hole|ingångshål|hole/i, 'beetle_entry_holes'],
  [/crown brown|kronan brun|brown crown/i, 'crown_browning'],
  [/crown thin|gles krona/i, 'crown_thinning'],
  [/wind|vind|blåst|blown/i, 'wind_damage'],
  [/storm|fell|fallen/i, 'storm_fell'],
  [/boar|vildsvin|rooting|bökning/i, 'wild_boar_rooting'],
  [/drought|torr|torka|dry/i, 'drought_stress'],
  [/fire|brand|eld/i, 'fire_damage'],
  [/fungal|svamp|rot|röta/i, 'fungal_infection'],
  [/healthy|frisk|fin|good condition/i, 'healthy_stand'],
  [/bark peel|bark loss|bark flak/i, 'bark_peeling'],
  [/resin|kåda|harts/i, 'resin_flow'],
  [/wet|blöt|vatten/i, 'wet_area'],
  [/erosion|urholkning/i, 'erosion'],
];

function extractSeverity(text: string): Severity {
  const lower = text.toLowerCase();
  if (/critical|allvarlig|emergency|akut|massive|widespread/.test(lower)) return 5;
  if (/severe|bad|major|many|significant|stora/.test(lower)) return 4;
  if (/moderate|some|several|noticeable|tydlig/.test(lower)) return 3;
  if (/minor|small|few|slight|liten/.test(lower)) return 2;
  return 1;
}

function extractCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(tree|träd|spruce|gran|pine|tall|stem|stamm)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractSpecies(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/spruce|gran|picea/.test(lower)) return 'Picea abies';
  if (/pine|tall|pinus/.test(lower)) return 'Pinus sylvestris';
  if (/birch|björk|betula/.test(lower)) return 'Betula pendula';
  if (/oak|ek|quercus/.test(lower)) return 'Quercus robur';
  return undefined;
}

export function extractObservationFromTranscript(transcript: string): ExtractedObservation {
  const keywords: string[] = [];
  let type: ObservationType = 'other';

  for (const [regex, obsType] of KEYWORD_MAP) {
    const match = transcript.match(regex);
    if (match) {
      type = obsType;
      keywords.push(match[0].toLowerCase());
    }
  }

  return {
    type,
    severity: extractSeverity(transcript),
    species: extractSpecies(transcript),
    count: extractCount(transcript),
    keywords,
  };
}

// ── Demo Data ───────────────────────────────────────────────────────────────

function generateDemoNotes(): VoiceNote[] {
  const notes: VoiceNote[] = [
    {
      id: 'voice_d01', userId: 'demo-user', recordedAt: daysAgo(1), durationSeconds: 28,
      lat: 57.186, lng: 14.048, parcelId: 'P001',
      transcript: 'I am standing at the south edge of parcel one. There is fresh bore dust at the base of at least three mature spruce trees. The trees look to be about sixty years old. I can see some entry holes, maybe two millimeter diameter. This looks like active beetle infestation. Severity seems moderate to bad, maybe a four out of five.',
      linkedObservationId: 'obs_d01',
    },
    {
      id: 'voice_d02', userId: 'demo-user', recordedAt: daysAgo(4), durationSeconds: 18,
      lat: 57.781, lng: 14.163, parcelId: 'P003',
      transcript: 'Major wind damage here from last week storm. I count about fifteen trees down, mostly spruce but some pine too. The access road is partially blocked by fallen trees. This is severe damage, maybe two hectares affected.',
    },
    {
      id: 'voice_d03', userId: 'demo-user', recordedAt: daysAgo(6), durationSeconds: 22,
      lat: 57.160, lng: 14.020, parcelId: 'P004',
      transcript: 'Walking through the regeneration area near the stream. Wild boar have been rooting here again. About thirty seedlings are destroyed, maybe more. The tubes did not help much. Need to consider fencing this section. Damage is minor to moderate overall.',
    },
    {
      id: 'voice_d04', userId: 'demo-user', recordedAt: daysAgo(2), durationSeconds: 15,
      lat: 57.230, lng: 14.120, parcelId: 'P005',
      transcript: 'Quick check on the mixed stand. Everything looks healthy and fine. Good crown density, nice green color. The thinning from last year seems to have worked well. No signs of stress or disease.',
    },
    {
      id: 'voice_d05', userId: 'demo-user', recordedAt: daysAgo(12), durationSeconds: 35,
      lat: 57.200, lng: 14.090, parcelId: 'P002',
      transcript: 'Standing in the young spruce plantation, ten year old trees. Several trees are showing drought stress, the needles are wilting and turning slightly brown. The soil is very dry, we have not had rain for about three weeks. I would rate this moderate severity, maybe three out of five. No signs of beetle yet but the trees are definitely stressed. I will check the soil moisture sensor data when I get back.',
    },
  ];

  // Add extracted observations
  return notes.map(note => ({
    ...note,
    extractedObservation: extractObservationFromTranscript(note.transcript),
  }));
}

// ── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  if (loadNotes().length === 0) {
    saveNotes(generateDemoNotes());
  }
  initialized = true;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function transcribeVoiceNote(
  _audioBlob: Blob,
  lat: number,
  lng: number
): VoiceNote {
  ensureInitialized();
  // Demo: return a pre-written transcript
  const demoTranscripts = [
    'I see some bore dust on a spruce tree near the road. Looks like fresh beetle activity. One tree affected so far.',
    'Checking the pine stand on the north side. Everything looks healthy. Good crown condition. No issues.',
    'Found some bark peeling on two birch trees. Probably frost crack from winter. Minor damage.',
  ];
  const transcript = demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)];

  const note: VoiceNote = {
    id: generateId(),
    userId: 'demo-user',
    recordedAt: Date.now(),
    durationSeconds: 10 + Math.round(Math.random() * 30),
    lat,
    lng,
    transcript,
    extractedObservation: extractObservationFromTranscript(transcript),
  };

  const all = loadNotes();
  all.unshift(note);
  saveNotes(all);
  return note;
}

export function getVoiceNotes(userId: string, dateRange?: { start: number; end: number }): VoiceNote[] {
  ensureInitialized();
  return loadNotes().filter(n => {
    if (n.userId !== userId) return false;
    if (dateRange) {
      return n.recordedAt >= dateRange.start && n.recordedAt <= dateRange.end;
    }
    return true;
  });
}

export function linkVoiceNoteToObservation(noteId: string, observationId: string): void {
  ensureInitialized();
  const all = loadNotes();
  const note = all.find(n => n.id === noteId);
  if (note) {
    note.linkedObservationId = observationId;
    saveNotes(all);
  }
}

export function getAllVoiceNotes(): VoiceNote[] {
  ensureInitialized();
  return loadNotes();
}
