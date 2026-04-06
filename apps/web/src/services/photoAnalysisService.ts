/**
 * Photo AI Analysis Service
 *
 * Simulates (and is structured for future real ONNX model integration)
 * photo analysis for bark beetle detection, tree species identification,
 * and forest health assessment.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Detection {
  label: string;
  confidence: number;
  category: 'pest' | 'disease' | 'damage' | 'species' | 'health';
}

export interface BoundingBox {
  x: number;      // % from left (0–100)
  y: number;      // % from top (0–100)
  width: number;  // % of image width
  height: number; // % of image height
  label: string;
  confidence: number;
  color: string;
}

export type AnalysisStatus = 'queued' | 'analyzing' | 'complete' | 'failed';
export type Severity = 'none' | 'early' | 'moderate' | 'severe';

export interface AnalysisResult {
  id: string;
  photoUrl: string;
  timestamp: Date;
  status: AnalysisStatus;

  // Detection results
  barkBeetleDetected: boolean;
  confidence: number;          // 0–1
  severity: Severity;

  // Species identification
  treeSpecies: string;
  speciesConfidence: number;   // 0–1

  // Additional detections
  detections: Detection[];

  // Bounding boxes for visualization
  boundingBoxes: BoundingBox[];

  // Recommendations
  recommendations: string[];

  // Model metadata
  modelVersion: string;
  processingTimeMs: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

// ── Species data ────────────────────────────────────────────────────────────

const SPECIES = [
  { name: 'Norway Spruce (Picea abies)', weight: 60 },
  { name: 'Scots Pine (Pinus sylvestris)', weight: 30 },
  { name: 'Silver Birch (Betula pendula)', weight: 10 },
];

// ── Detection templates ─────────────────────────────────────────────────────

const HEALTHY_DETECTIONS: Detection[] = [
  { label: 'Healthy bark texture', confidence: 0.94, category: 'health' },
  { label: 'Normal crown density', confidence: 0.89, category: 'health' },
  { label: 'No resin flow anomalies', confidence: 0.91, category: 'health' },
];

const EARLY_DETECTIONS: Detection[] = [
  { label: 'Bore dust on trunk base', confidence: 0.78, category: 'pest' },
  { label: 'Ips typographus gallery entry', confidence: 0.72, category: 'pest' },
  { label: 'Minor crown yellowing', confidence: 0.65, category: 'damage' },
];

const MODERATE_DETECTIONS: Detection[] = [
  { label: 'Extensive bore holes', confidence: 0.88, category: 'pest' },
  { label: 'Bark beetle frass accumulation', confidence: 0.85, category: 'pest' },
  { label: 'Crown discoloration (30-60%)', confidence: 0.82, category: 'damage' },
  { label: 'Woodpecker feeding signs', confidence: 0.74, category: 'pest' },
];

const SEVERE_DETECTIONS: Detection[] = [
  { label: 'Massive bark detachment', confidence: 0.93, category: 'pest' },
  { label: 'Complete crown browning', confidence: 0.91, category: 'damage' },
  { label: 'Bark beetle exit holes (dense)', confidence: 0.89, category: 'pest' },
  { label: 'Secondary fungal infection', confidence: 0.76, category: 'disease' },
];

// ── Bounding box generators ────────────────────────────────────────────────

function generateHealthyBoxes(): BoundingBox[] {
  return [
    {
      x: rand(20, 40), y: rand(10, 30),
      width: rand(20, 35), height: rand(25, 40),
      label: 'Healthy canopy',
      confidence: 0.92,
      color: '#22c55e',
    },
  ];
}

function generateEarlyBoxes(): BoundingBox[] {
  return [
    {
      x: rand(30, 50), y: rand(50, 65),
      width: rand(12, 18), height: rand(10, 15),
      label: 'Bore dust',
      confidence: 0.75,
      color: '#f59e0b',
    },
    {
      x: rand(25, 45), y: rand(15, 30),
      width: rand(25, 35), height: rand(20, 30),
      label: 'Crown — early stress',
      confidence: 0.68,
      color: '#f59e0b',
    },
  ];
}

function generateModerateBoxes(): BoundingBox[] {
  return [
    {
      x: rand(25, 40), y: rand(35, 50),
      width: rand(15, 25), height: rand(20, 30),
      label: 'Bore holes',
      confidence: 0.86,
      color: '#f97316',
    },
    {
      x: rand(20, 35), y: rand(55, 70),
      width: rand(10, 18), height: rand(8, 14),
      label: 'Frass deposit',
      confidence: 0.82,
      color: '#f97316',
    },
    {
      x: rand(20, 40), y: rand(5, 20),
      width: rand(30, 40), height: rand(20, 30),
      label: 'Crown discoloration',
      confidence: 0.79,
      color: '#ef4444',
    },
  ];
}

function generateSevereBoxes(): BoundingBox[] {
  return [
    {
      x: rand(15, 35), y: rand(20, 40),
      width: rand(30, 45), height: rand(35, 50),
      label: 'Bark detachment',
      confidence: 0.91,
      color: '#ef4444',
    },
    {
      x: rand(20, 40), y: rand(5, 15),
      width: rand(30, 40), height: rand(15, 25),
      label: 'Dead crown',
      confidence: 0.93,
      color: '#ef4444',
    },
    {
      x: rand(40, 55), y: rand(60, 75),
      width: rand(8, 14), height: rand(8, 14),
      label: 'Exit holes',
      confidence: 0.87,
      color: '#dc2626',
    },
  ];
}

// ── Recommendations ─────────────────────────────────────────────────────────

const HEALTHY_RECS = [
  'No immediate action required. Tree appears healthy.',
  'Continue regular monitoring during swarming season (May–August).',
  'Consider scheduling a drone survey in 4–6 weeks for wider area coverage.',
];

const EARLY_RECS = [
  'Early signs of bark beetle activity detected. Inspect the tree in person within 1 week.',
  'Check neighbouring trees within 50 m for similar bore dust patterns.',
  'Consider placing pheromone traps in the area to monitor beetle population.',
  'Report finding to Skogsstyrelsen if confirmed during field inspection.',
];

const MODERATE_RECS = [
  'Moderate bark beetle infestation confirmed. Sanitation felling recommended within 2 weeks.',
  'Remove and transport infested timber at least 1 km from the stand before beetle emergence.',
  'Notify adjacent forest owners about the outbreak.',
  'File an avverkningsanmalan (harvesting notification) if area exceeds 0.5 ha.',
  'Contact a certified forestry contractor for prompt removal.',
];

const SEVERE_RECS = [
  'Severe infestation — immediate sanitation felling is critical.',
  'Prioritise removal of all infested trees to prevent spread to healthy stands.',
  'Contact Skogsstyrelsen for guidance and potential outbreak notification.',
  'Engage a forestry contractor immediately; delays increase spread risk exponentially.',
  'Document damage with GPS-tagged photos for insurance and compliance records.',
  'File avverkningsanmalan (harvesting notification) for the affected area.',
];

// ── Demo analysis generator ─────────────────────────────────────────────────

function generateDemoResult(photoUrl: string): AnalysisResult {
  const species = pick(
    SPECIES.map((s) => s.name),
    SPECIES.map((s) => s.weight),
  );

  // 70% healthy, 20% early, 7% moderate, 3% severe
  const severity = pick<Severity>(
    ['none', 'early', 'moderate', 'severe'],
    [70, 20, 7, 3],
  );

  const beetleDetected = severity !== 'none';

  let confidence: number;
  let detections: Detection[];
  let boxes: BoundingBox[];
  let recs: string[];

  switch (severity) {
    case 'none':
      confidence = rand(0.88, 0.97);
      detections = HEALTHY_DETECTIONS.slice(0, randInt(1, 3));
      boxes = generateHealthyBoxes();
      recs = HEALTHY_RECS.slice(0, randInt(2, 3));
      break;
    case 'early':
      confidence = rand(0.65, 0.82);
      detections = EARLY_DETECTIONS.slice(0, randInt(2, 3));
      boxes = generateEarlyBoxes();
      recs = EARLY_RECS.slice(0, randInt(3, 4));
      break;
    case 'moderate':
      confidence = rand(0.78, 0.90);
      detections = MODERATE_DETECTIONS.slice(0, randInt(2, 4));
      boxes = generateModerateBoxes();
      recs = MODERATE_RECS.slice(0, randInt(3, 5));
      break;
    case 'severe':
      confidence = rand(0.85, 0.96);
      detections = SEVERE_DETECTIONS.slice(0, randInt(3, 4));
      boxes = generateSevereBoxes();
      recs = SEVERE_RECS.slice(0, randInt(4, 6));
      break;
  }

  // Add species detection
  detections.push({
    label: species,
    confidence: rand(0.75, 0.95),
    category: 'species',
  });

  return {
    id: uid(),
    photoUrl,
    timestamp: new Date(),
    status: 'complete',
    barkBeetleDetected: beetleDetected,
    confidence,
    severity,
    treeSpecies: species,
    speciesConfidence: rand(0.78, 0.96),
    detections,
    boundingBoxes: boxes,
    recommendations: recs,
    modelVersion: 'beetlesense-v2.1-demo',
    processingTimeMs: Math.round(rand(1500, 3000)),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse a photo for bark beetle damage, tree species, and health.
 *
 * In demo mode this returns simulated results after a realistic delay.
 * The function signature is designed so a real ONNX model can replace
 * the demo logic by swapping out the body of this function.
 *
 * @param imageSource - a Blob, File, or object-URL string of the photo
 * @param options     - optional overrides (signal for abort, etc.)
 */
export async function analysePhoto(
  imageSource: Blob | File | string,
  options?: { signal?: AbortSignal },
): Promise<AnalysisResult> {
  // Derive a URL for the result record
  const photoUrl =
    typeof imageSource === 'string'
      ? imageSource
      : URL.createObjectURL(imageSource);

  // Simulate processing delay (1.5–3 s)
  const delay = Math.round(rand(1500, 3000));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    options?.signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Analysis aborted', 'AbortError'));
    });
  });

  // ── Future hook: replace with real model inference ──
  // import { InferenceSession, Tensor } from 'onnxruntime-web';
  // const session = await InferenceSession.create('/models/beetlesense.onnx');
  // const tensor = preprocessImage(imageSource);
  // const output = await session.run({ input: tensor });
  // return postprocess(output);

  return generateDemoResult(photoUrl);
}

/**
 * Run batch analysis on multiple photos.
 */
export async function analysePhotoBatch(
  images: (Blob | File | string)[],
  onProgress?: (completed: number, total: number) => void,
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  for (let i = 0; i < images.length; i++) {
    const result = await analysePhoto(images[i]);
    results.push(result);
    onProgress?.(i + 1, images.length);
  }
  return results;
}

// ── Analysis history (in-memory for demo) ───────────────────────────────────

const HISTORY_KEY = 'beetlesense-analysis-history';
const MAX_HISTORY = 10;

export function getAnalysisHistory(): AnalysisResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisResult[];
    // Restore Date objects
    return parsed.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }));
  } catch {
    return [];
  }
}

export function saveToHistory(result: AnalysisResult): void {
  try {
    const history = getAnalysisHistory();
    history.unshift(result);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore
  }
}
