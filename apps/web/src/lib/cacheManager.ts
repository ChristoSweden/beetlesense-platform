/**
 * CacheManager — pre-caches map tiles, analysis results, and AI responses
 * for offline Field Mode usage in areas without mobile coverage.
 */

import { useFieldModeStore, type CachedAIResponse } from '@/stores/fieldModeStore';
import { DEMO_PARCELS, isDemo } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { cacheData, cacheBatch } from '@/lib/offlineStorage';
import type { SensorProduct, FusionProduct } from '@/hooks/useSensorProducts';

// ─── Cached AI field guidance (always available offline) ───

const FIELD_AI_GUIDANCE: CachedAIResponse[] = [
  {
    questionKey: 'beetle_damage_look',
    question: 'What does bark beetle damage look like?',
    answer:
      'Look for these signs on spruce trees:\n\n1. **Brown boring dust** (frass) at the base of the trunk and in bark crevices — this is the most reliable early indicator.\n2. **Small round entry holes** (1-2mm diameter) in the bark, often with resin beads around them.\n3. **Bark falling off** revealing serpentine galleries (tunnels) etched into the inner bark.\n4. **Crown discoloration** — needles turning from green to yellow-brown, starting at the top.\n5. **Woodpecker activity** — increased pecking indicates beetles under the bark.\n6. **Resin flow** — stressed trees may produce abnormal resin as a defense mechanism.\n\nThe European spruce bark beetle (Ips typographus / granbarkborre) primarily attacks Norway spruce (gran). Attacks typically begin in May-June when temperatures exceed 18-20°C.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'identify_spruce_pine',
    question: 'How do I identify spruce vs pine?',
    answer:
      '**Norway Spruce (Gran / Picea abies)**\n- Needles: Short (1-2cm), four-sided, stiff, attached singly around the branch\n- Bark: Thin, reddish-brown to grey, scaly\n- Cones: Long (10-16cm), hanging downward\n- Crown: Narrow, conical, dense\n- Branches: Drooping (especially lower branches)\n\n**Scots Pine (Tall / Pinus sylvestris)**\n- Needles: Long (3-7cm), paired (two needles per bundle), bluish-green\n- Bark: Upper trunk is distinctive orange-red and flaky; lower trunk is dark and deeply furrowed\n- Cones: Small (3-7cm), egg-shaped\n- Crown: Open, rounded or flat-topped (mature trees)\n- Branches: Horizontal to ascending\n\n**Quick field test:** Pull a needle off — spruce needles are individually attached and leave a small peg on the branch. Pine needles come in pairs from a tiny sheath.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'found_beetle_damage',
    question: 'What should I do if I find beetle damage?',
    answer:
      'If you find bark beetle damage, act quickly:\n\n1. **Document it** — Take photos of the damage, boring dust, and affected trees. Note the GPS location.\n2. **Mark affected trees** — Use spray paint or flagging tape so you can find them again.\n3. **Assess the extent** — Walk the area to estimate how many trees are affected.\n4. **Contact your forestry advisor** (skoglig rådgivare) or Skogsstyrelsen.\n5. **Plan removal** — Infested trees should be removed and transported at least 10km from the forest, or bark should be destroyed before the next beetle generation emerges (typically within 6-8 weeks of attack).\n6. **Check surrounding stands** — Beetles spread to neighboring trees, especially during warm weather.\n\n**Legal obligation:** Under Swedish forestry law (Skogsvårdslagen), you are required to take action against bark beetle infestations. Skogsstyrelsen can mandate removal if you do not act.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'report_skogsstyrelsen',
    question: 'When should I report damage to Skogsstyrelsen?',
    answer:
      'You should contact Skogsstyrelsen (the Swedish Forest Agency) when:\n\n1. **Large-scale infestation** — More than ~50 trees affected, or the infestation is spreading rapidly.\n2. **Protected areas** — If damage occurs near or in a nature reserve (naturreservat) or Natura 2000 site.\n3. **You need advice** — Skogsstyrelsen provides free guidance on beetle management.\n4. **Compliance reporting** — If you have been notified of a mandatory removal order.\n5. **Storm damage** — Large windthrow events should be reported as they attract beetles.\n\n**Contact:**\n- Phone: 0771-787 100\n- Web: skogsstyrelsen.se\n- Email: skogsstyrelsen@skogsstyrelsen.se\n\n**Regional offices:** Use their website to find your local district (distrikt) for faster response.\n\nYou can also report via BeetleSense — the app will generate a formatted report with GPS coordinates and photos that you can send directly.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'beetle_season',
    question: 'When is bark beetle season in Sweden?',
    answer:
      '**Primary flight season:** May to August\n\n- **First generation:** Beetles emerge and swarm when temperature exceeds 18-20°C for several consecutive days, typically mid-May to June.\n- **Second generation:** In warm years, a second generation can emerge in July-August.\n- **Overwintering:** Adult beetles and larvae overwinter in the bark or soil litter.\n\n**Key monitoring periods:**\n- **April-May:** Check pheromone traps, inspect sun-exposed edges of spruce stands.\n- **June-July:** Peak activity. Check for fresh boring dust weekly.\n- **August-September:** Look for crown discoloration in spruce stands.\n- **October-November:** Assess total damage before winter.\n\n**Climate trend:** Due to warmer temperatures, beetle season has been starting 2-3 weeks earlier in recent years. Southern Sweden (Götaland) is most at risk.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'pheromone_traps',
    question: 'How do pheromone traps work?',
    answer:
      '**Pheromone traps** attract bark beetles using synthetic versions of the aggregation pheromones beetles use to signal mass-attack on trees.\n\n**Setup:**\n1. Place traps at forest edges, especially south/southwest-facing sides.\n2. Deploy by early May (before beetle flight begins).\n3. Space traps at least 10-15m from the nearest spruce tree to avoid directing beetles to living trees.\n4. Hang the pheromone dispenser inside the trap collector.\n\n**Monitoring:**\n- Check traps weekly during flight season.\n- Count trapped beetles to gauge population pressure.\n- Replace pheromone dispensers every 6-8 weeks.\n\n**Limitations:**\n- Traps catch only a fraction of the beetle population.\n- They are a monitoring tool, not a control method by themselves.\n- Most effective as an early warning system combined with visual inspection.\n\n**Where to buy:** Available from Skogma, or order through your local Skogsstyrelsen office.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'emergency_felling',
    question: 'How do I do emergency felling of infested trees?',
    answer:
      '**Emergency felling (sanitäravverkning) steps:**\n\n1. **Identify all infested trees** — Look for boring dust, entry holes, bark detachment. Mark each tree.\n2. **Prioritize freshly attacked trees** — These contain developing larvae that must be destroyed.\n3. **Fell and remove** — Transport logs at least 10km from the forest, OR:\n   - Debark logs on-site (removes beetle habitat)\n   - Process through a sawmill within 3 weeks\n4. **Handle slash/tops** — Bark beetles can also breed in thick branches.\n5. **Timing is critical** — Complete removal before the next generation emerges (typically 6-8 weeks after initial attack in summer conditions).\n\n**Safety:**\n- Always wear protective equipment (chainsaw protection, helmet, eye/ear protection).\n- Work in pairs.\n- Infested trees may have weakened root plates — assess stability before felling.\n\n**Permits:** Emergency felling generally does not require a permit, but notify Skogsstyrelsen if felling more than 0.5 hectares.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'measure_tree',
    question: 'How do I measure tree diameter and height?',
    answer:
      '**Diameter at Breast Height (DBH):**\n1. Measure at 1.3m above ground on the uphill side.\n2. Use a diameter tape (klave) or regular tape measure.\n3. With regular tape: divide circumference by 3.14 (pi) to get diameter.\n4. Measure in centimeters.\n\n**Tree Height:**\n- **Clinometer method:** Stand at a known distance (e.g., 20m) from the tree. Measure the angle to the top and to the base. Height = distance x (tan(angle to top) + tan(angle to base)).\n- **Stick method:** Hold a stick at arm\'s length equal to the distance between your hand and eye. Walk back until the stick covers the full tree height. Your distance from the tree roughly equals the tree height.\n- **Smartphone apps:** Several apps use the phone\'s sensors to estimate height (e.g., "Arboreal" or "Forest Scanner").\n\n**Volume estimation:** Use Swedish SLU volume functions: Volume (m³) varies by species, DBH, and height. Standard tables are published by SLU (Riksskogstaxeringen).',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'soil_assessment',
    question: 'How do I assess soil type in the field?',
    answer:
      '**Quick field soil assessment:**\n\n1. **Dig a small hole** (30-40cm deep) with a spade.\n2. **Texture test:** Take a moist sample and roll it between your fingers:\n   - **Sand:** Gritty, won\'t hold shape\n   - **Silt:** Smooth, floury feel, holds shape briefly\n   - **Clay:** Sticky, plastic, holds shape well\n   - **Moraine (morän):** Mix of grain sizes — most common in Swedish forests\n3. **Color:** Dark topsoil indicates good organic content. Grey/blue subsoil indicates waterlogging.\n4. **Soil depth:** Measure depth to bedrock or hardpan if reachable.\n5. **Moisture:** Note if water seeps into the hole.\n6. **Humus layer:** Measure the organic layer thickness.\n\n**Common Swedish forest soils:**\n- **Morän (moraine):** Mixed glacial deposits — good for most species\n- **Sediment:** Sorted clay, silt, or sand — flat terrain\n- **Torv (peat):** Organic, wet — limited growth\n- **Berg (bedrock):** Thin soil, exposed rock — poor growth\n\n**Site index:** Combine soil type with vegetation indicators (blueberry = medium, lingonberry = dry, herbs = rich) to estimate productivity.',
    cachedAt: Date.now(),
  },
  {
    questionKey: 'wildlife_damage_types',
    question: 'What types of wildlife damage should I look for?',
    answer:
      '**Common wildlife damage in Swedish forests:**\n\n**Moose (Älg):**\n- Bark stripping on young pine (winter)\n- Browsing of leader shoots and side branches\n- Broken stems from bending\n- Most common in young stands (2-5m height)\n\n**Deer (Rådjur/Kronhjort):**\n- Bark fraying from antler rubbing\n- Browsing of deciduous seedlings and shoots\n- Smaller than moose damage\n\n**Wild Boar (Vildsvin):**\n- Ground rooting — turned-up soil in patches\n- Damage to root systems of young plants\n- Destroyed regeneration areas\n\n**Voles (Sork):**\n- Bark gnawing at ground level (under snow)\n- Ring-barking kills seedlings\n- Most damaging in grass-rich clearcuts\n\n**Woodpeckers (Hackspett):**\n- Pecking holes in bark (actually helpful — indicates beetle presence)\n- Rings of sap wells (lesser spotted woodpecker)\n\n**Documentation tips:** Photograph the damage type, estimate percentage of affected stems, note species and size class of damaged trees, and record GPS position.',
    cachedAt: Date.now(),
  },
];

// ─── Cache Manager ───

export interface CacheProgress {
  step: string;
  percent: number;
}

export async function prepareFieldModeCache(
  onProgress: (progress: CacheProgress) => void,
): Promise<void> {
  const store = useFieldModeStore.getState();

  // Step 1: Cache AI responses (30%)
  onProgress({ step: 'ai_responses', percent: 10 });
  store.setCachedAIResponses(FIELD_AI_GUIDANCE);
  await delay(200); // Small delay so progress bar feels natural
  onProgress({ step: 'ai_responses', percent: 30 });

  // Step 2: Cache map tiles for known parcels (30% -> 60%)
  onProgress({ step: 'map_tiles', percent: 35 });
  await cacheMapTilesForParcels();
  onProgress({ step: 'map_tiles', percent: 60 });

  // Step 3: Cache latest analysis results (60% -> 70%)
  onProgress({ step: 'analysis_results', percent: 65 });
  await cacheAnalysisResults();
  onProgress({ step: 'analysis_results', percent: 70 });

  // Step 4: Cache sensor products for all parcels (70% -> 90%)
  onProgress({ step: 'sensor_products', percent: 72 });
  const parcels = DEMO_PARCELS; // In production, fetch user's actual parcels
  for (let i = 0; i < parcels.length; i++) {
    try {
      await cacheSensorProducts(parcels[i].id);
    } catch (err) {
      console.warn(`cacheSensorProducts failed for parcel ${parcels[i].id}`, err);
    }
    const pct = 72 + Math.round(((i + 1) / parcels.length) * 18);
    onProgress({ step: 'sensor_products', percent: pct });
  }

  // Step 5: Verify storage quota (90% -> 100%)
  onProgress({ step: 'storage_check', percent: 92 });
  await checkStorageQuota();
  onProgress({ step: 'storage_check', percent: 100 });

  store.setCacheReady(true);
  store.setCacheProgress(100);
}

async function cacheMapTilesForParcels(): Promise<void> {
  // Pre-cache OSM tiles at useful zoom levels for each parcel center
  const cache = await caches.open('field-mode-tiles');
  const parcels = DEMO_PARCELS; // In production, fetch user's actual parcels

  for (const parcel of parcels) {
    const [lng, lat] = parcel.center;
    // Cache tiles at zoom levels 12-16 for the parcel area
    for (const z of [12, 13, 14, 15]) {
      const { x, y } = lngLatToTile(lng, lat, z);
      // Cache a 3x3 grid around the center tile
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tileUrl = `https://a.tile.openstreetmap.org/${z}/${x + dx}/${y + dy}.png`;
          try {
            const cached = await cache.match(tileUrl);
            if (!cached) {
              const response = await fetch(tileUrl, { mode: 'cors' });
              if (response.ok) {
                await cache.put(tileUrl, response);
              }
            }
          } catch {
            // Tile caching is best-effort — skip failures silently
          }
        }
      }
    }
  }
}

async function cacheAnalysisResults(): Promise<void> {
  // In production, this would fetch latest analysis results from Supabase
  // and store them in IndexedDB. For now, the demo data is already in memory.
  await delay(300);
}

async function checkStorageQuota(): Promise<{ used: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getStorageEstimate(): Promise<{
  usedMB: number;
  quotaMB: number;
  percentUsed: number;
} | null> {
  const result = await checkStorageQuota();
  if (!result) return null;
  const usedMB = Math.round(result.used / (1024 * 1024));
  const quotaMB = Math.round(result.quota / (1024 * 1024));
  return {
    usedMB,
    quotaMB,
    percentUsed: quotaMB > 0 ? Math.round((usedMB / quotaMB) * 100) : 0,
  };
}

export function getCachedAIGuidance(): CachedAIResponse[] {
  return FIELD_AI_GUIDANCE;
}

// ─── Sensor Data Caching ───

/** Key sensor product types worth caching metadata + signed URLs for field use */
const KEY_PRODUCT_NAMES = ['ndvi', 'thermal_anomaly', 'orthomosaic', 'canopy_height_model'];

/** Fusion products to cache summaries from */
const KEY_FUSION_NAMES = ['beetle_stress', 'crown_health', 'tree_inventory'];

export interface CachedSensorProduct {
  id: string;
  parcel_id: string;
  survey_id: string;
  sensor_type: string;
  product_name: string;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
  signed_url: string | null;
  cached_at: number;
}

export interface CachedFusionSummary {
  id: string;
  parcel_id: string;
  product_name: string;
  sensors_used: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  cached_at: number;
}

export interface CachedTreeInventorySummary {
  parcel_id: string;
  tree_count: number;
  mean_height_m: number | null;
  total_volume_m3: number | null;
  species_detected: number | null;
  stressed_count: number | null;
  cached_at: number;
}

/**
 * Caches sensor product metadata, signed download URLs for key products,
 * fusion product summaries, and tree inventory stats for a given parcel.
 * Stores everything in IndexedDB for offline field mode access.
 */
export async function cacheSensorProducts(parcelId: string): Promise<void> {
  let sensorProducts: SensorProduct[] = [];
  let fusionProducts: FusionProduct[] = [];

  if (isSupabaseConfigured && !isDemo()) {
    try {
      const [spRes, fpRes] = await Promise.all([
        supabase
          .from('sensor_products')
          .select('*')
          .eq('parcel_id', parcelId)
          .order('created_at', { ascending: false }),
        supabase
          .from('fusion_products')
          .select('*')
          .eq('parcel_id', parcelId)
          .order('created_at', { ascending: false }),
      ]);

      if (!spRes.error && spRes.data) sensorProducts = spRes.data as SensorProduct[];
      if (!fpRes.error && fpRes.data) fusionProducts = fpRes.data as FusionProduct[];
    } catch (err) {
      console.warn('cacheSensorProducts: failed to fetch from Supabase', err);
    }
  }

  // In demo mode or when no live data is available, sensor products will be
  // empty. The field mode UI should handle this gracefully (show "no data cached").
  // Demo sensor data is rendered via useSensorProducts hook at display time.

  const now = Date.now();

  // 1. Cache key sensor product metadata with signed download URLs
  const keyProducts = sensorProducts.filter((p) =>
    KEY_PRODUCT_NAMES.includes(p.product_name),
  );

  const cachedProducts: Array<{ key: string; data: CachedSensorProduct }> = [];

  for (const product of keyProducts) {
    let signedUrl: string | null = null;

    if (isSupabaseConfigured && !isDemo()) {
      try {
        const { data } = await supabase.storage
          .from('survey-data')
          .createSignedUrl(product.storage_path, 86400); // 24h expiry for field use
        signedUrl = data?.signedUrl ?? null;
      } catch {
        // Best-effort URL generation
      }
    }

    cachedProducts.push({
      key: `${parcelId}:${product.product_name}:${product.id}`,
      data: {
        id: product.id,
        parcel_id: product.parcel_id,
        survey_id: product.survey_id,
        sensor_type: product.sensor_type,
        product_name: product.product_name,
        storage_path: product.storage_path,
        metadata: product.metadata,
        created_at: product.created_at,
        signed_url: signedUrl,
        cached_at: now,
      },
    });
  }

  if (cachedProducts.length > 0) {
    await cacheBatch('sensor-products', cachedProducts);
  }

  // 2. Cache fusion product summaries (beetle_stress score, crown_health, tree count)
  const keyFusion = fusionProducts.filter((p) =>
    KEY_FUSION_NAMES.includes(p.product_name),
  );

  const fusionEntries: Array<{ key: string; data: CachedFusionSummary }> = keyFusion.map(
    (fp) => ({
      key: `${parcelId}:${fp.product_name}`,
      data: {
        id: fp.id,
        parcel_id: fp.parcel_id,
        product_name: fp.product_name,
        sensors_used: fp.sensors_used,
        metadata: fp.metadata,
        created_at: fp.created_at,
        cached_at: now,
      },
    }),
  );

  if (fusionEntries.length > 0) {
    await cacheBatch('fusion-summaries', fusionEntries);
  }

  // 3. Cache tree inventory summary (aggregated stats per parcel)
  const treeInventoryFusion = fusionProducts.find(
    (fp) => fp.product_name === 'tree_inventory',
  );

  if (treeInventoryFusion) {
    const meta = treeInventoryFusion.metadata as Record<string, unknown>;
    const summary: CachedTreeInventorySummary = {
      parcel_id: parcelId,
      tree_count: (meta.tree_count as number) ?? 0,
      mean_height_m: (meta.mean_height_m as number) ?? null,
      total_volume_m3: (meta.total_volume_m3 as number) ?? null,
      species_detected: (meta.species_detected as number) ?? null,
      stressed_count: (meta.stressed_count as number) ?? null,
      cached_at: now,
    };

    await cacheData('tree-inventory-summary', `parcel:${parcelId}`, summary);
  }

  // 4. Optionally cache thumbnail/preview images (not full COGs)
  // Cache preview images from the Cache API for lightweight offline viewing
  if (isSupabaseConfigured && !isDemo()) {
    const previewCache = await caches.open('field-mode-sensor-previews');
    for (const product of cachedProducts) {
      if (product.data.signed_url) {
        try {
          // Only cache if the URL looks like a thumbnail/preview (not multi-GB COGs)
          const meta = product.data.metadata as Record<string, unknown>;
          const fileSizeMb = (meta.file_size_mb as number) ?? 0;
          // Skip products larger than 50MB — those are full COGs
          if (fileSizeMb > 50) continue;

          const cached = await previewCache.match(product.data.signed_url);
          if (!cached) {
            // Attempt to fetch a preview/thumbnail version if available
            // In production, the storage would have _thumb variants
            const thumbPath = product.data.storage_path.replace(
              /\.(tif|tiff)$/,
              '_thumb.png',
            );
            try {
              const { data: thumbData } = await supabase.storage
                .from('survey-data')
                .createSignedUrl(thumbPath, 86400);
              if (thumbData?.signedUrl) {
                const response = await fetch(thumbData.signedUrl, { mode: 'cors' });
                if (response.ok && response.headers.get('content-length')) {
                  const size = parseInt(response.headers.get('content-length') ?? '0', 10);
                  // Only cache thumbnails under 2MB
                  if (size < 2 * 1024 * 1024) {
                    await previewCache.put(thumbData.signedUrl, response);
                  }
                }
              }
            } catch {
              // Thumbnail fetch is best-effort
            }
          }
        } catch {
          // Preview caching is best-effort
        }
      }
    }
  }

  // Update the field mode store with cached sensor data
  const store = useFieldModeStore.getState();
  store.setCachedSensorData({
    sensorProducts: cachedProducts.map((cp) => cp.data),
    fusionSummaries: fusionEntries.map((fe) => fe.data),
    treeInventorySummary: treeInventoryFusion
      ? {
          parcel_id: parcelId,
          tree_count: ((treeInventoryFusion.metadata as Record<string, unknown>).tree_count as number) ?? 0,
          mean_height_m: ((treeInventoryFusion.metadata as Record<string, unknown>).mean_height_m as number) ?? null,
          total_volume_m3: ((treeInventoryFusion.metadata as Record<string, unknown>).total_volume_m3 as number) ?? null,
          species_detected: ((treeInventoryFusion.metadata as Record<string, unknown>).species_detected as number) ?? null,
          stressed_count: ((treeInventoryFusion.metadata as Record<string, unknown>).stressed_count as number) ?? null,
          cached_at: now,
        }
      : null,
  });
}

// ─── Helpers ───

function lngLatToTile(
  lng: number,
  lat: number,
  zoom: number,
): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * 2 ** zoom);
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) +
          1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      2 ** zoom,
  );
  return { x, y };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
