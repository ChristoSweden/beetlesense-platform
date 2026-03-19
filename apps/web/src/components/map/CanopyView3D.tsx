import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TreePine, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface CanopyView3DProps {
  parcelId?: string;
  /** Height data: array of [x, y, height, ndvi, temp_anomaly] */
  heightGrid?: Float32Array;
  gridWidth?: number;
  gridHeight?: number;
}

interface TreePoint {
  x: number;
  y: number;
  height: number;
  crownRadius: number;
  ndvi: number;
  tempAnomaly: number;
  species: string;
  healthScore: number;
}

type ColorMode = 'health' | 'species' | 'height' | 'thermal';

const COLOR_MODES: Array<{ id: ColorMode; label: string; labelSv: string }> = [
  { id: 'health', label: 'Health', labelSv: 'Hälsa' },
  { id: 'species', label: 'Species', labelSv: 'Trädslag' },
  { id: 'height', label: 'Height', labelSv: 'Höjd' },
  { id: 'thermal', label: 'Thermal', labelSv: 'Termisk' },
];

const SPECIES_COLORS: Record<string, number> = {
  Gran: 0x1a7a3a,
  Tall: 0x4a8c3f,
  Björk: 0x7ab648,
  Ek: 0x5a7a2a,
  Asp: 0x8acc5a,
};

function getTreeColor(tree: TreePoint, mode: ColorMode): THREE.Color {
  switch (mode) {
    case 'health': {
      const s = tree.healthScore;
      if (s < 30) return new THREE.Color(0xef4444);
      if (s < 50) return new THREE.Color(0xf97316);
      if (s < 65) return new THREE.Color(0xeab308);
      if (s < 80) return new THREE.Color(0x84cc16);
      return new THREE.Color(0x22c55e);
    }
    case 'species':
      return new THREE.Color(SPECIES_COLORS[tree.species] ?? 0x5a8a62);
    case 'height': {
      const t = Math.min(tree.height / 35, 1);
      return new THREE.Color().setRGB(
        (100 + 155 * (1 - t)) / 255,
        (150 + 100 * t) / 255,
        (50 + 50 * (1 - t)) / 255,
      );
    }
    case 'thermal': {
      const a = tree.tempAnomaly;
      if (a > 2) return new THREE.Color(0xef4444);
      if (a > 1) return new THREE.Color(0xf97316);
      if (a > 0.5) return new THREE.Color(0xeab308);
      if (a < -1) return new THREE.Color(0x3b82f6);
      return new THREE.Color(0x22c55e);
    }
  }
}

/**
 * Pseudo-random number generator from seed.
 */
function rng(seed: number): number {
  return ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
}

/**
 * Simple 2D value noise for terrain displacement.
 */
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

function fbm(x: number, y: number, octaves: number = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

/**
 * Generate demo tree data for 3D visualization.
 */
function generateDemoTrees(parcelId: string): TreePoint[] {
  const _parcel = DEMO_PARCELS.find((p) => p.id === parcelId) ?? DEMO_PARCELS[0];
  const trees: TreePoint[] = [];

  const speciesList = ['Gran', 'Gran', 'Gran', 'Tall', 'Tall', 'Björk'];
  const count = parcelId === 'p2' ? 45 : parcelId === 'p1' ? 35 : 40;

  for (let i = 0; i < count; i++) {
    const angle = rng(i * 7.3) * Math.PI * 2;
    const dist = rng(i * 13.7) * 80 + 10;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const species = speciesList[Math.floor(rng(i * 3.1) * speciesList.length)];

    const baseHeight = species === 'Gran' ? 22 : species === 'Tall' ? 20 : 14;
    const height = baseHeight + (rng(i * 5.9) - 0.5) * 12;
    const crownRadius = height * 0.15 + rng(i * 2.3) * 2;

    // Beetle-affected zone in parcel p1
    const inBeetleZone = parcelId === 'p1' && x > 20 && y > 10;
    const ndvi = inBeetleZone ? 0.3 + rng(i * 8.1) * 0.2 : 0.65 + rng(i * 8.1) * 0.25;
    const tempAnomaly = inBeetleZone ? 1.5 + rng(i * 9.3) * 1.5 : -0.5 + rng(i * 9.3) * 1.0;
    const healthScore = inBeetleZone ? 20 + rng(i * 11.2) * 30 : 65 + rng(i * 11.2) * 35;

    trees.push({ x, y, height: Math.max(3, height), crownRadius, ndvi, tempAnomaly, species, healthScore });
  }

  return trees;
}

// ─── Tree geometry builders ───

function buildSpruceCanopy(tree: TreePoint, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();

  // Trunk — cylinder
  const trunkH = tree.height * 0.55;
  const trunkR = tree.crownRadius * 0.12;
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage — stacked cones for spruce
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    const layerT = l / layers;
    const coneH = tree.height * 0.25 * (1 - layerT * 0.3);
    const coneR = tree.crownRadius * (1 - layerT * 0.3);
    const coneGeo = new THREE.ConeGeometry(coneR, coneH, 8);
    const shade = 0.85 + layerT * 0.15;
    const coneColor = color.clone().multiplyScalar(shade);
    const coneMat = new THREE.MeshStandardMaterial({ color: coneColor, roughness: 0.8, flatShading: true });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = trunkH + l * (coneH * 0.6) + coneH / 2;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  }

  return group;
}

function buildPineCanopy(tree: TreePoint, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();

  // Trunk — taller trunk for pine
  const trunkH = tree.height * 0.65;
  const trunkR = tree.crownRadius * 0.1;
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4e2a, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage — sphere canopy at top
  const sphereR = tree.crownRadius * 1.1;
  const sphereGeo = new THREE.SphereGeometry(sphereR, 8, 6);
  const sphereMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.y = trunkH + sphereR * 0.6;
  sphere.scale.y = 0.7; // flatten slightly
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  group.add(sphere);

  return group;
}

function buildBirchCanopy(tree: TreePoint, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();

  // Trunk — white/light birch trunk
  const trunkH = tree.height * 0.6;
  const trunkR = tree.crownRadius * 0.08;
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.7 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  // Birch bark stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
  for (let s = 0; s < 4; s++) {
    const stripeGeo = new THREE.CylinderGeometry(trunkR * 0.65, trunkR * 1.02, 0.15, 6);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = trunkH * 0.2 + s * trunkH * 0.18;
    group.add(stripe);
  }

  // Foliage — elongated ellipsoid
  const canopyR = tree.crownRadius * 1.0;
  const canopyGeo = new THREE.SphereGeometry(canopyR, 8, 6);
  const canopyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = trunkH + canopyR * 0.6;
  canopy.scale.set(1, 1.3, 1); // elongated vertically
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);

  return group;
}

function buildTreeModel(tree: TreePoint, color: THREE.Color): THREE.Group {
  switch (tree.species) {
    case 'Gran':
      return buildSpruceCanopy(tree, color);
    case 'Tall':
      return buildPineCanopy(tree, color);
    case 'Björk':
      return buildBirchCanopy(tree, color);
    default:
      return buildSpruceCanopy(tree, color); // fallback
  }
}

/**
 * Create ground plane with displacement noise and optional thermal heatmap.
 */
function createGround(
  trees: TreePoint[],
  colorMode: ColorMode,
): THREE.Mesh {
  const size = 220;
  const segments = 80;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const h = fbm(x * 0.015, z * 0.015, 4) * 3.5;
    posAttr.setY(i, h);
  }
  geo.computeVertexNormals();

  // Generate vertex colors for ground — base is dark forest floor
  const colors = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const n = fbm(x * 0.03, z * 0.03, 3);

    let r = 0.04 + n * 0.06;
    let g = 0.08 + n * 0.1;
    let b = 0.03 + n * 0.04;

    // Thermal heatmap under stressed trees
    if (colorMode === 'thermal' || colorMode === 'health') {
      for (const tree of trees) {
        if (tree.healthScore >= 40) continue;
        const dx = x - tree.x;
        const dz = z - tree.y;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const radius = tree.crownRadius * 3;
        if (dist < radius) {
          const intensity = (1 - dist / radius) * 0.4;
          r += intensity * 0.6;
          g -= intensity * 0.03;
          b -= intensity * 0.02;
        }
      }
    }

    colors[i * 3] = Math.min(1, r);
    colors[i * 3 + 1] = Math.min(1, g);
    colors[i * 3 + 2] = Math.min(1, b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Create stress indicator ring (red wireframe torus) for unhealthy trees.
 */
function createStressRing(tree: TreePoint): THREE.Mesh {
  const ringR = tree.crownRadius * 1.5;
  const tubeR = 0.15;
  const geo = new THREE.TorusGeometry(ringR, tubeR, 8, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(tree.x, tree.height * 0.75, tree.y);
  return ring;
}

/**
 * Create ambient occlusion / shadow blob on ground beneath each tree.
 */
function createShadowBlob(tree: TreePoint): THREE.Mesh {
  const r = tree.crownRadius * 1.5;
  const geo = new THREE.CircleGeometry(r, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // Slightly above ground to avoid z-fighting
  const groundY = fbm(tree.x * 0.015, tree.y * 0.015, 4) * 3.5;
  mesh.position.set(tree.x, groundY + 0.05, tree.y);
  return mesh;
}

/**
 * CanopyView3D — Three.js 3D visualization of forest canopy.
 *
 * Shows individual tree models (spruce cones, pine spheres, birch ellipsoids)
 * colored by health, species, height, or thermal mode.
 * Interactive orbit controls for rotate/zoom/pan.
 * Stressed trees have red wireframe rings, ground shows thermal heatmap.
 */
export default function CanopyView3D({ parcelId = 'p1' }: CanopyView3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const [colorMode, setColorMode] = useState<ColorMode>('health');

  const trees = useMemo(() => generateDemoTrees(parcelId), [parcelId]);

  // Build / rebuild scene whenever colorMode or trees change
  const buildScene = useCallback((scene: THREE.Scene) => {
    // Clear existing scene objects (keep lights and camera)
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Group) {
        if (obj.parent === scene) toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });

    // Ground
    const ground = createGround(trees, colorMode);
    scene.add(ground);

    // Trees
    for (const tree of trees) {
      const color = getTreeColor(tree, colorMode);
      const model = buildTreeModel(tree, color);
      const groundY = fbm(tree.x * 0.015, tree.y * 0.015, 4) * 3.5;
      model.position.set(tree.x, groundY, tree.y);
      scene.add(model);

      // Shadow blob
      const shadow = createShadowBlob(tree);
      scene.add(shadow);

      // Stress ring for unhealthy trees
      if (tree.healthScore < 40) {
        const ring = createStressRing(tree);
        ring.position.y += groundY;
        scene.add(ring);
      }
    }
  }, [trees, colorMode]);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.setClearColor(0x0a1a0f);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1a0f, 0.004);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 500);
    camera.position.set(80, 60, 80);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 250;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.update();
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0x3a5a4a, 0.6);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2a4a2a, 0.4);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(60, 80, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 250;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Subtle fill light from opposite side
    const fill = new THREE.DirectionalLight(0x8899aa, 0.3);
    fill.position.set(-40, 30, -60);
    scene.add(fill);

    // Build initial scene content
    buildScene(scene);

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Animation loop
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelId]);

  // Rebuild scene objects when color mode changes (without recreating renderer)
  useEffect(() => {
    if (sceneRef.current) {
      buildScene(sceneRef.current);
    }
  }, [buildScene]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(80, 60, 80);
      controlsRef.current.target.set(0, 5, 0);
      controlsRef.current.update();
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (cameraRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, 10);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (cameraRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, -10);
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-[#0a1a0f] border border-[var(--border)]">
      {/* Three.js container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
          <TreePine size={14} className="text-[var(--green)]" />
          <span className="text-xs font-medium text-white">3D Kronvy</span>
        </div>
      </div>

      {/* Color mode selector */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {COLOR_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setColorMode(mode.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              colorMode === mode.id
                ? 'bg-[var(--green)] text-[var(--bg)]'
                : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/70'
            }`}
          >
            {mode.labelSv}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button onClick={zoomIn} className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70">
          <ZoomIn size={16} />
        </button>
        <button onClick={zoomOut} className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70">
          <ZoomOut size={16} />
        </button>
        <button onClick={resetCamera} className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs text-white/80">
          {colorMode === 'health' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Stressad</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" />Varning</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Frisk</span>
            </>
          )}
          {colorMode === 'species' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a7a3a' }} />Gran</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4a8c3f' }} />Tall</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7ab648' }} />Björk</span>
            </>
          )}
          {colorMode === 'thermal' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" />Kall</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Normal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Varm</span>
            </>
          )}
          {colorMode === 'height' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(255,150,100)' }} />Låg</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(150,220,70)' }} />Medel</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(100,250,50)' }} />Hög</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
