import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mountain, Layers } from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── Types ───

interface TerrainViewProps {
  parcelId?: string;
  defaultLayer?: DataLayer;
}

type DataLayer = 'ndvi' | 'thermal' | 'risk' | 'height';

const LAYER_CONFIG: Array<{ id: DataLayer; label: string }> = [
  { id: 'ndvi', label: 'NDVI' },
  { id: 'thermal', label: 'Termisk' },
  { id: 'risk', label: 'Risk' },
  { id: 'height', label: 'Höjd' },
];

// ─── Noise functions ───

function rng(seed: number): number {
  return ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sfx = fx * fx * (3 - 2 * fx);
  const sfy = fy * fy * (3 - 2 * fy);
  const n00 = rng(ix * 127.1 + iy * 311.7);
  const n10 = rng((ix + 1) * 127.1 + iy * 311.7);
  const n01 = rng(ix * 127.1 + (iy + 1) * 311.7);
  const n11 = rng((ix + 1) * 127.1 + (iy + 1) * 311.7);
  const nx0 = n00 * (1 - sfx) + n10 * sfx;
  const nx1 = n01 * (1 - sfx) + n11 * sfx;
  return nx0 * (1 - sfy) + nx1 * sfy;
}

function fbm(x: number, y: number, octaves: number = 5): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return val;
}

/**
 * Get terrain height at a given world x, z coordinate.
 */
function getTerrainHeight(x: number, z: number, seed: number): number {
  // Swedish hilly terrain: rolling hills with occasional ridges
  const base = fbm((x + seed) * 0.006, (z + seed * 0.7) * 0.006, 5) * 30;
  const detail = fbm((x + seed) * 0.02, (z + seed * 0.7) * 0.02, 3) * 5;
  const ridge = Math.max(0, fbm((x + seed) * 0.003, (z + seed) * 0.005, 3) - 0.45) * 40;
  return base + detail + ridge;
}

// ─── Color mapping functions ───

function ndviColor(height: number, x: number, z: number): THREE.Color {
  // NDVI: greens with variation
  const n = fbm(x * 0.02, z * 0.02, 3);
  const ndvi = 0.3 + n * 0.6;
  // Low elevation = denser vegetation
  const elev = Math.min(height / 40, 1);
  const r = 0.05 + (1 - ndvi) * 0.3;
  const g = 0.15 + ndvi * 0.7 - elev * 0.15;
  const b = 0.02 + (1 - ndvi) * 0.1;
  return new THREE.Color(r, Math.max(0.1, g), b);
}

function thermalColor(height: number, x: number, z: number): THREE.Color {
  // Thermal: blue (cool) to red (warm), valleys are warmer
  const n = fbm(x * 0.015, z * 0.015, 3);
  const temp = 1 - (height / 45) + n * 0.3; // lower = cooler (higher elevation)
  const t = Math.max(0, Math.min(1, temp));
  // Blue -> cyan -> green -> yellow -> red
  if (t < 0.25) return new THREE.Color(0.1, 0.15, 0.5 + t * 2);
  if (t < 0.5) return new THREE.Color(0.05, 0.3 + (t - 0.25) * 2, 0.7 - (t - 0.25) * 1.5);
  if (t < 0.75) return new THREE.Color((t - 0.5) * 3, 0.7 - (t - 0.5) * 1.5, 0.1);
  return new THREE.Color(0.8 + (t - 0.75) * 0.8, 0.3 - (t - 0.75) * 1.0, 0.05);
}

function riskColor(height: number, x: number, z: number, seed: number): THREE.Color {
  // Beetle risk: green (safe) -> yellow (moderate) -> red (high risk)
  // Spruce-heavy areas at certain elevations are higher risk
  const spruceDensity = fbm((x + seed * 2) * 0.01, (z + seed * 2) * 0.01, 3);
  const moistureStress = 1 - Math.min(height / 35, 1); // lower elevations = drier in summer
  const risk = spruceDensity * 0.5 + moistureStress * 0.3 + fbm(x * 0.025, z * 0.025, 2) * 0.2;
  const r = Math.max(0, Math.min(1, risk));

  if (r < 0.35) return new THREE.Color(0.1, 0.4 + r * 0.5, 0.08);
  if (r < 0.6) return new THREE.Color(0.4 + (r - 0.35) * 2, 0.5 + (r - 0.35) * 0.4, 0.05);
  return new THREE.Color(0.7 + (r - 0.6) * 0.7, 0.3 - (r - 0.6) * 0.6, 0.04);
}

function heightColor(height: number): THREE.Color {
  // Hypsometric: low=green, mid=brown, high=gray/white
  const t = Math.min(height / 45, 1);
  if (t < 0.3) return new THREE.Color(0.12, 0.25 + t * 0.8, 0.08);
  if (t < 0.6) return new THREE.Color(0.2 + (t - 0.3) * 1.0, 0.35 + (t - 0.3) * 0.3, 0.08 + (t - 0.3) * 0.2);
  if (t < 0.85) return new THREE.Color(0.4 + (t - 0.6) * 0.5, 0.35 + (t - 0.6) * 0.3, 0.15 + (t - 0.6) * 0.3);
  return new THREE.Color(0.6 + (t - 0.85) * 2, 0.6 + (t - 0.85) * 2, 0.55 + (t - 0.85) * 2);
}

function getLayerColor(layer: DataLayer, height: number, x: number, z: number, seed: number): THREE.Color {
  switch (layer) {
    case 'ndvi': return ndviColor(height, x, z);
    case 'thermal': return thermalColor(height, x, z);
    case 'risk': return riskColor(height, x, z, seed);
    case 'height': return heightColor(height);
  }
}

// ─── Tree generation ───

interface SimpleTree {
  x: number;
  z: number;
  y: number; // terrain height at position
  height: number;
  species: 'spruce' | 'pine' | 'birch';
}

function generateTerrainTrees(seed: number, terrainSize: number): SimpleTree[] {
  const trees: SimpleTree[] = [];
  const half = terrainSize / 2;
  const count = 280;

  for (let i = 0; i < count; i++) {
    const x = (rng(i * 7.31 + seed) - 0.5) * terrainSize * 0.9;
    const z = (rng(i * 13.71 + seed) - 0.5) * terrainSize * 0.9;

    // Skip water/too-low areas
    const h = getTerrainHeight(x + half, z + half, seed);
    if (h < 3) continue;

    // Species based on elevation: spruce mid, pine high, birch low
    const elev = h / 40;
    let species: SimpleTree['species'] = 'spruce';
    const sp = rng(i * 3.1 + seed);
    if (elev > 0.6 && sp < 0.6) species = 'pine';
    else if (elev < 0.35 && sp < 0.4) species = 'birch';

    const baseH = species === 'spruce' ? 8 : species === 'pine' ? 7 : 5;
    const treeH = baseH + rng(i * 5.9 + seed) * 5;

    trees.push({ x, z, y: h, height: treeH, species });
  }

  return trees;
}

// ─── Component ───

/**
 * TerrainView — 3D terrain viewer for parcel detail pages.
 *
 * Uses Three.js with procedural terrain, data layer draping,
 * and instanced tree meshes. Swedish labels throughout.
 */
export default function TerrainView({ parcelId = 'p1', defaultLayer = 'ndvi' }: TerrainViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);

  const [activeLayer, setActiveLayer] = useState<DataLayer>(defaultLayer);

  // Stable seed from parcelId
  const seed = useMemo(() => {
    let s = 0;
    for (let i = 0; i < parcelId.length; i++) s += parcelId.charCodeAt(i) * (i + 1);
    return s;
  }, [parcelId]);

  const parcel = useMemo(
    () => DEMO_PARCELS.find((p) => p.id === parcelId) ?? DEMO_PARCELS[0],
    [parcelId],
  );

  const terrainSize = 300;
  const segments = 299; // ~300x300 grid

  // Generate terrain geometry (stable per parcel)
  const buildTerrainGeometry = useCallback(() => {
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i) + terrainSize / 2;
      const z = posAttr.getZ(i) + terrainSize / 2;
      const h = getTerrainHeight(x, z, seed);
      posAttr.setY(i, h);
    }
    geo.computeVertexNormals();

    return geo;
  }, [seed, terrainSize, segments]);

  // Apply vertex colors for the active data layer
  const applyLayerColors = useCallback((geo: THREE.BufferGeometry, layer: DataLayer) => {
    const posAttr = geo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i) + terrainSize / 2;
      const z = posAttr.getZ(i) + terrainSize / 2;
      const h = posAttr.getY(i);
      const c = getLayerColor(layer, h, x, z, seed);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const existing = geo.attributes.color;
    if (existing) (existing as THREE.BufferAttribute).needsUpdate = true;
  }, [seed, terrainSize]);

  // Build instanced tree meshes
  const buildTreeInstances = useCallback((scene: THREE.Scene) => {
    const treesData = generateTerrainTrees(seed, terrainSize);

    // Spruce = cone + cylinder
    const spruces = treesData.filter(t => t.species === 'spruce');
    if (spruces.length > 0) {
      // Trunk instances
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 1, 5);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, spruces.length);
      trunkMesh.castShadow = true;

      // Canopy instances
      const coneGeo = new THREE.ConeGeometry(1, 1, 6);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0x1a6a2a, roughness: 0.8, flatShading: true });
      const coneMesh = new THREE.InstancedMesh(coneGeo, coneMat, spruces.length);
      coneMesh.castShadow = true;
      coneMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      spruces.forEach((t, i) => {
        // Trunk
        const trunkH = t.height * 0.5;
        dummy.position.set(t.x, t.y + trunkH / 2, t.z);
        dummy.scale.set(1, trunkH, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);

        // Canopy
        const coneH = t.height * 0.6;
        const coneR = t.height * 0.22;
        dummy.position.set(t.x, t.y + trunkH + coneH / 2, t.z);
        dummy.scale.set(coneR, coneH, coneR);
        dummy.updateMatrix();
        coneMesh.setMatrixAt(i, dummy.matrix);
      });

      scene.add(trunkMesh);
      scene.add(coneMesh);
    }

    // Pine = sphere + cylinder
    const pines = treesData.filter(t => t.species === 'pine');
    if (pines.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1, 5);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4e2a, roughness: 0.9 });
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, pines.length);
      trunkMesh.castShadow = true;

      const sphereGeo = new THREE.SphereGeometry(1, 6, 5);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x2a7a35, roughness: 0.75, flatShading: true });
      const sphereMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, pines.length);
      sphereMesh.castShadow = true;
      sphereMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      pines.forEach((t, i) => {
        const trunkH = t.height * 0.6;
        dummy.position.set(t.x, t.y + trunkH / 2, t.z);
        dummy.scale.set(1, trunkH, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);

        const canopyR = t.height * 0.2;
        dummy.position.set(t.x, t.y + trunkH + canopyR * 0.5, t.z);
        dummy.scale.set(canopyR, canopyR * 0.65, canopyR);
        dummy.updateMatrix();
        sphereMesh.setMatrixAt(i, dummy.matrix);
      });

      scene.add(trunkMesh);
      scene.add(sphereMesh);
    }

    // Birch = ellipsoid + white cylinder
    const birches = treesData.filter(t => t.species === 'birch');
    if (birches.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.15, 1, 5);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.7 });
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, birches.length);
      trunkMesh.castShadow = true;

      const canopyGeo = new THREE.SphereGeometry(1, 6, 5);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x6aaa40, roughness: 0.7, flatShading: true });
      const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, birches.length);
      canopyMesh.castShadow = true;
      canopyMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      birches.forEach((t, i) => {
        const trunkH = t.height * 0.55;
        dummy.position.set(t.x, t.y + trunkH / 2, t.z);
        dummy.scale.set(1, trunkH, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);

        const canopyR = t.height * 0.18;
        dummy.position.set(t.x, t.y + trunkH + canopyR * 0.6, t.z);
        dummy.scale.set(canopyR, canopyR * 1.3, canopyR);
        dummy.updateMatrix();
        canopyMesh.setMatrixAt(i, dummy.matrix);
      });

      scene.add(trunkMesh);
      scene.add(canopyMesh);
    }
  }, [seed, terrainSize]);

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.setClearColor(0x0a1a0f);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d1f10, 0.0025);
    sceneRef.current = scene;

    // Camera — 45-degree default angle looking down
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 800);
    camera.position.set(180, 130, 180);
    camera.lookAt(0, 10, 0);
    cameraRef.current = camera;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 10, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 40;
    controls.maxDistance = 400;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0x3a5a4a, 0.5);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2a4a2a, 0.35);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.3);
    sun.position.set(100, 120, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -180;
    sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180;
    sun.shadow.camera.bottom = -180;
    sun.shadow.bias = -0.0008;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6688aa, 0.25);
    fill.position.set(-80, 50, -100);
    scene.add(fill);

    // Terrain
    const geo = buildTerrainGeometry();
    applyLayerColors(geo, activeLayer);

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      flatShading: false,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    terrainMeshRef.current = terrain;

    // Tree instances
    buildTreeInstances(scene);

    // Water plane at low elevation
    const waterGeo = new THREE.PlaneGeometry(terrainSize * 1.2, terrainSize * 1.2);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a2a3a,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 2.5;
    scene.add(water);

    // Resize
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Animate
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    
  }, [parcelId]);

  // Update terrain colors when layer changes
  useEffect(() => {
    const terrain = terrainMeshRef.current;
    if (!terrain) return;
    applyLayerColors(terrain.geometry, activeLayer);
  }, [activeLayer, applyLayerColors]);

  return (
    <div className="relative w-full h-full min-h-[450px] rounded-xl overflow-hidden bg-[#0a1a0f] border border-[var(--border)]">
      {/* Three.js container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Title */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
          <Mountain size={14} className="text-[var(--green)]" />
          <span className="text-xs font-medium text-white">
            Terrängvy — {parcel.name}
          </span>
        </div>
      </div>

      {/* Layer toggle buttons */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {LAYER_CONFIG.map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeLayer === layer.id
                ? 'bg-[var(--green)] text-[var(--bg)]'
                : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/70'
            }`}
          >
            <Layers size={11} />
            {layer.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs text-white/80">
          {activeLayer === 'ndvi' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a4a15' }} />Låg</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2a8a25' }} />Medel</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4acc40' }} />Hög</span>
            </>
          )}
          {activeLayer === 'thermal' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" />Kall</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Normal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Varm</span>
            </>
          )}
          {activeLayer === 'risk' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600" />Låg risk</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" />Medel</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Hög risk</span>
            </>
          )}
          {activeLayer === 'height' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2a6a18' }} />Låg</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8a6a30' }} />Medel</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#aaa' }} />Hög</span>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
        <span className="text-[10px] text-white/50">
          Dra för att rotera | Scrolla för att zooma
        </span>
      </div>
    </div>
  );
}
