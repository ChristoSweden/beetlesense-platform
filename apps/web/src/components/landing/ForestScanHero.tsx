import { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BG_COLOR = 0x030d05;
const LIDAR_COLOR = new THREE.Color(0x00f2ff);
const LIDAR_COLOR_HEX = 0x00f2ff;
const _TREE_GREEN = new THREE.Color(0x0a4a1a);
const GROUND_COLOR = new THREE.Color(0x051a08);

// Responsive config
function getConfig() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return {
    treeCount: isMobile ? 40 : 80,
    particleCount: isMobile ? 3000 : 8000,
    scanLineParticles: isMobile ? 200 : 500,
    shadowsEnabled: !isMobile,
  };
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedCounter(
  target: number,
  duration: number,
  startDelay: number,
  trigger: boolean,
  decimals = 0,
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let raf: number;
    const startTime = performance.now() + startDelay;

    function tick(now: number) {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, startDelay, trigger, decimals]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Stats overlay component                                            */
/* ------------------------------------------------------------------ */

interface StatItemProps {
  label: string;
  value: string;
  delay: number;
  scanProgress: number;
  threshold: number;
}

const StatItem = memo(function StatItem({ label, value, delay, scanProgress, threshold }: StatItemProps) {
  const visible = scanProgress >= threshold;
  return (
    <div
      className={`flex flex-col items-center gap-1 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="text-lg sm:text-2xl md:text-3xl font-bold tabular-nums" style={{ color: '#00f2ff' }}>
        {value}
      </span>
      <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#7fdbca] font-medium">
        {label}
      </span>
    </div>
  );
});

function StatsOverlay({ scanProgress }: { scanProgress: number }) {
  const trees = useAnimatedCounter(2847, 3000, 200, scanProgress > 0.1);
  const species = useAnimatedCounter(12, 2500, 600, scanProgress > 0.25);
  const risk = useAnimatedCounter(3.2, 2000, 1000, scanProgress > 0.4, 1);
  const canopy = useAnimatedCounter(89, 2500, 1400, scanProgress > 0.55);
  const hectares = useAnimatedCounter(147, 2000, 1800, scanProgress > 0.7);

  return (
    <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-4">
      {/* Scan progress bar */}
      <div className="mb-4 mx-auto max-w-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#00f2ff]/70">
            LiDAR Scan Progress
          </span>
          <span className="text-[10px] font-mono text-[#00f2ff]/70">
            {Math.round(scanProgress * 100)}%
          </span>
        </div>
        <div className="h-[2px] w-full bg-[#1a3a1d] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${scanProgress * 100}%`,
              background: 'linear-gradient(90deg, #00f2ff, #33f5ff)',
              boxShadow: '0 0 12px #00f2ff',
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div
        className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 rounded-2xl border border-[#1a3a1d] bg-[#030d05] px-4 py-4 sm:px-6 sm:py-5"
        style={{ boxShadow: '0 0 40px rgba(0,242,255,0.06), inset 0 1px 0 rgba(0,242,255,0.08)' }}
      >
        <StatItem label="Trees Detected" value={trees.toLocaleString()} delay={0} scanProgress={scanProgress} threshold={0.1} />
        <StatItem label="Species ID'd" value={String(species)} delay={100} scanProgress={scanProgress} threshold={0.25} />
        <StatItem label="Beetle Risk" value={`${risk}%`} delay={200} scanProgress={scanProgress} threshold={0.4} />
        <StatItem label="Canopy Density" value={`${canopy}%`} delay={300} scanProgress={scanProgress} threshold={0.55} />
        <StatItem label="Area Scanned" value={`${hectares} ha`} delay={400} scanProgress={scanProgress} threshold={0.7} />
        <StatItem label="Last Scan" value="2h ago" delay={500} scanProgress={scanProgress} threshold={0.85} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Three.js Scene Builder                                             */
/* ------------------------------------------------------------------ */

interface TreeData {
  x: number;
  z: number;
  height: number;
  canopyRadius: number;
  species: number; // 0=spruce, 1=pine, 2=birch
  scanned: boolean;
}

function createForestScene(
  canvas: HTMLCanvasElement,
  containerWidth: number,
  containerHeight: number,
) {
  const config = getConfig();
  const clock = new THREE.Clock();

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(containerWidth, containerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BG_COLOR, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG_COLOR, 0.012);

  // --- Camera --- (drone perspective)
  const camera = new THREE.PerspectiveCamera(55, containerWidth / containerHeight, 0.5, 300);
  camera.position.set(0, 35, 60);
  camera.lookAt(0, 0, 0);

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0x0a2a0f, 0.4);
  scene.add(ambientLight);

  const moonLight = new THREE.DirectionalLight(0x8899aa, 0.3);
  moonLight.position.set(50, 80, 30);
  scene.add(moonLight);

  // Subtle green rim light from below
  const rimLight = new THREE.PointLight(0x00f2ff, 0.15, 100);
  rimLight.position.set(0, -5, 0);
  scene.add(rimLight);

  // --- Ground plane ---
  const groundGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
  // Slightly perturb ground vertices for terrain feel
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    posAttr.setZ(i, (Math.sin(x * 0.1) * Math.cos(y * 0.1) * 1.5) + Math.random() * 0.3);
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    color: GROUND_COLOR,
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);

  // --- Generate trees ---
  const trees: TreeData[] = [];
  const treeGroup = new THREE.Group();
  scene.add(treeGroup);

  // Material pools (shared for performance)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.9 });
  const spruceMat = new THREE.MeshStandardMaterial({ color: 0x0a3a15, roughness: 0.8 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1a4a20, roughness: 0.75 });
  const birchMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.7 });
  const canopyMats = [spruceMat, pineMat, birchMat];

  // Scanned (LiDAR wireframe) material
  const scanWireMat = new THREE.MeshBasicMaterial({
    color: LIDAR_COLOR,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
  });

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 1, 6);
  const spruceCanopyGeo = new THREE.ConeGeometry(1, 1, 6);
  const pineCanopyGeo = new THREE.SphereGeometry(1, 6, 5);
  const birchCanopyGeo = new THREE.SphereGeometry(1, 5, 4);
  const canopyGeos = [spruceCanopyGeo, pineCanopyGeo, birchCanopyGeo];

  for (let i = 0; i < config.treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 55;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 10;
    const species = Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2;
    const height = 5 + Math.random() * 10;
    const canopyRadius = 1.5 + Math.random() * 2;

    trees.push({ x, z, height, canopyRadius, species, scanned: false });

    // Trunk
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.set(1, height, 1);
    trunk.position.set(x, height / 2, z);
    treeGroup.add(trunk);

    // Canopy layers
    const layerCount = species === 0 ? 3 : species === 1 ? 2 : 1;
    for (let l = 0; l < layerCount; l++) {
      const canopy = new THREE.Mesh(canopyGeos[species], canopyMats[species]);
      const layerScale = canopyRadius * (1 - l * 0.25);
      const layerHeight = species === 0 ? height * 0.6 + l * 2 : height * 0.7 + l * 1.5;
      canopy.scale.set(layerScale, layerScale * (species === 0 ? 1.5 : 0.8), layerScale);
      canopy.position.set(x, layerHeight, z);
      canopy.userData = { treeIndex: i, isCanopy: true };
      treeGroup.add(canopy);
    }
  }

  // --- Point cloud (initially invisible, built up by scan) ---
  const pointCount = config.particleCount;
  const pointPositions = new Float32Array(pointCount * 3);
  const pointColors = new Float32Array(pointCount * 3);
  const pointAlphas = new Float32Array(pointCount);

  for (let i = 0; i < pointCount; i++) {
    // Scatter points around tree locations + ground
    const isTreePoint = Math.random() < 0.7;
    if (isTreePoint && trees.length > 0) {
      const tree = trees[Math.floor(Math.random() * trees.length)];
      const r = Math.random() * tree.canopyRadius * 1.2;
      const theta = Math.random() * Math.PI * 2;
      const h = Math.random() * tree.height;
      pointPositions[i * 3] = tree.x + Math.cos(theta) * r;
      pointPositions[i * 3 + 1] = h;
      pointPositions[i * 3 + 2] = tree.z + Math.sin(theta) * r;
    } else {
      pointPositions[i * 3] = (Math.random() - 0.5) * 120;
      pointPositions[i * 3 + 1] = Math.random() * 1.5;
      pointPositions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 10;
    }
    // LiDAR green-cyan gradient
    const t = Math.random();
    pointColors[i * 3] = 0 + t * 0.1;
    pointColors[i * 3 + 1] = 0.8 + t * 0.2;
    pointColors[i * 3 + 2] = 0.7 + t * 0.3;
    pointAlphas[i] = 0; // hidden initially
  }

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
  pointGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));

  const pointMat = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(pointGeo, pointMat);
  scene.add(points);

  // --- LiDAR scan line (sweeping plane of laser points) ---
  const scanLineGeo = new THREE.BufferGeometry();
  const scanLinePositions = new Float32Array(config.scanLineParticles * 3);
  const scanLineColors = new Float32Array(config.scanLineParticles * 3);
  for (let i = 0; i < config.scanLineParticles; i++) {
    scanLinePositions[i * 3] = 0;
    scanLinePositions[i * 3 + 1] = Math.random() * 30;
    scanLinePositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    scanLineColors[i * 3] = 0;
    scanLineColors[i * 3 + 1] = 0.95;
    scanLineColors[i * 3 + 2] = 1.0;
  }
  scanLineGeo.setAttribute('position', new THREE.BufferAttribute(scanLinePositions, 3));
  scanLineGeo.setAttribute('color', new THREE.BufferAttribute(scanLineColors, 3));

  const scanLineMat = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const scanLine = new THREE.Points(scanLineGeo, scanLineMat);
  scene.add(scanLine);

  // --- Horizontal laser beam lines ---
  const laserCount = 5;
  const laserLines: THREE.Line[] = [];
  const laserLineMat = new THREE.LineBasicMaterial({
    color: LIDAR_COLOR_HEX,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });

  for (let i = 0; i < laserCount; i++) {
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const line = new THREE.Line(lineGeo, laserLineMat);
    scene.add(line);
    laserLines.push(line);
  }

  // --- Scan state ---
  let scanX = -60; // scan sweeps from left to right
  const scanSpeed = 18; // world units per second
  const scanWidth = 120;
  let scanProgress = 0;
  let revealedPointCount = 0;

  // Track which tree meshes have been swapped to wireframe
  const scannedTreeIndices = new Set<number>();

  // --- Animation state ---
  let animationId: number;
  let onScanProgress: ((p: number) => void) | null = null;

  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // --- Camera drift (gentle drone movement) ---
    camera.position.x = Math.sin(elapsed * 0.08) * 8;
    camera.position.y = 35 + Math.sin(elapsed * 0.05) * 2;
    camera.position.z = 60 + Math.cos(elapsed * 0.06) * 5;
    camera.lookAt(Math.sin(elapsed * 0.03) * 3, 5, -10);

    // --- Advance scan line ---
    if (scanProgress < 1) {
      scanX += scanSpeed * delta;
      scanProgress = Math.min((scanX + 60) / scanWidth, 1);

      // Update scan line particle positions
      const slPos = scanLineGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < config.scanLineParticles; i++) {
        slPos.setX(i, scanX + (Math.random() - 0.5) * 1.5);
        slPos.setY(i, Math.random() * 28);
        slPos.setZ(i, (Math.random() - 0.5) * 100);
      }
      slPos.needsUpdate = true;

      // Pulse scan line opacity
      scanLineMat.opacity = 0.6 + Math.sin(elapsed * 12) * 0.3;

      // Update laser lines
      for (let i = 0; i < laserCount; i++) {
        const lineGeo = laserLines[i].geometry;
        const linePos = lineGeo.attributes.position as THREE.BufferAttribute;
        const y = 25 + i * 2;
        linePos.setXYZ(0, scanX, y, -60);
        linePos.setXYZ(1, scanX, 0, (Math.random() - 0.5) * 80);
        linePos.needsUpdate = true;
      }

      // Reveal point cloud particles behind scan line
      const pPos = pointGeo.attributes.position as THREE.BufferAttribute;
      for (let i = revealedPointCount; i < pointCount; i++) {
        if (pPos.getX(i) < scanX) {
          revealedPointCount = i + 1;
        }
      }

      // Sort points so that only revealed ones render with opacity
      // We modulate point material opacity globally based on progress
      pointMat.opacity = 0.3 + scanProgress * 0.6;

      // Toggle trees to wireframe as scan passes them
      for (let ti = 0; ti < trees.length; ti++) {
        if (!scannedTreeIndices.has(ti) && trees[ti].x < scanX) {
          scannedTreeIndices.add(ti);
          // Find canopy meshes for this tree and add wireframe overlay
          treeGroup.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.userData.treeIndex === ti && child.userData.isCanopy) {
              const wireOverlay = new THREE.Mesh(child.geometry, scanWireMat.clone());
              wireOverlay.position.copy(child.position);
              wireOverlay.scale.copy(child.scale).multiplyScalar(1.05);
              wireOverlay.userData.wireOverlay = true;
              treeGroup.add(wireOverlay);
            }
          });
        }
      }

      // Notify progress callback
      onScanProgress?.(scanProgress);
    } else {
      // Scan complete — fade out scan line
      scanLineMat.opacity *= 0.95;
    }

    // --- Slowly fade out original tree materials, fade in point cloud ---
    if (scanProgress > 0.3) {
      const fadeAmount = Math.min((scanProgress - 0.3) * 0.5, 0.3);
      spruceMat.opacity = 1 - fadeAmount;
      pineMat.opacity = 1 - fadeAmount;
      birchMat.opacity = 1 - fadeAmount;
      spruceMat.transparent = true;
      pineMat.transparent = true;
      birchMat.transparent = true;
    }

    // --- Pulsate wireframe overlays ---
    treeGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.userData.wireOverlay) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + Math.sin(elapsed * 3 + child.position.x * 0.5) * 0.2;
      }
    });

    // --- Subtle point cloud shimmer ---
    const pColors = pointGeo.attributes.color as THREE.BufferAttribute;
    // Only update a small subset per frame for perf
    const updateCount = Math.min(200, pointCount);
    for (let i = 0; i < updateCount; i++) {
      const idx = (Math.floor(elapsed * 500) + i) % pointCount;
      const shimmer = 0.8 + Math.sin(elapsed * 2 + idx * 0.01) * 0.2;
      pColors.setY(idx, shimmer);
    }
    pColors.needsUpdate = true;

    renderer.render(scene, camera);
  }

  // --- Resize handler ---
  function resize(w: number, h: number) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // --- Cleanup ---
  function dispose() {
    cancelAnimationFrame(animationId);
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    pointGeo.dispose();
    pointMat.dispose();
    scanLineGeo.dispose();
    scanLineMat.dispose();
  }

  // Start!
  animate();

  return {
    resize,
    dispose,
    setScanProgressCallback(cb: (p: number) => void) {
      onScanProgress = cb;
    },
  };
}

/* ------------------------------------------------------------------ */
/*  React Component                                                    */
/* ------------------------------------------------------------------ */

function ForestScanHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createForestScene> | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const sceneCtrl = createForestScene(canvas, w, h);
    sceneRef.current = sceneCtrl;

    sceneCtrl.setScanProgressCallback((p) => {
      setScanProgress(p);
    });

    setCanvasReady(true);

    return () => {
      sceneCtrl.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sceneRef.current) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        sceneRef.current?.resize(width, height);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [canvasReady]);

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#030d05' }}
    >
      {/* Three.js canvas */}
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ touchAction: 'pan-y' }}
        />
      </div>

      {/* Top gradient fade (for nav readability) */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#030d05] to-transparent z-10 pointer-events-none" />

      {/* Bottom gradient fade (for stats readability) */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#030d05] via-[#030d05]/80 to-transparent z-10 pointer-events-none" />

      {/* Main content overlay */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-[-5vh]">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1a3a1d] bg-[#030d05] mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" />
          <span className="text-[10px] sm:text-xs font-mono text-[#00f2ff] uppercase tracking-[0.2em]">
            AI-Powered LiDAR Analysis
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-5">
          <span
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #00f2ff 0%, #33f5ff 40%, #80f8ff 100%)' }}
          >
            Forest Intelligence
          </span>
          <span className="block text-[#eaeaec] mt-1">
            From Above
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-[#7fdbca] max-w-xl mx-auto mb-8 leading-relaxed">
          BeetleSense scans your forest with satellite and drone LiDAR,
          detecting bark beetle infestations weeks before they become visible.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/demo"
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00f2ff, #33f5ff)',
              color: '#030d05',
              boxShadow: '0 0 30px rgba(0,242,255,0.3), 0 4px 20px rgba(0,242,255,0.15)',
            }}
          >
            <BookOpen className="w-5 h-5" />
            Start Free Trial
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[#00f2ff]/25 text-[#00f2ff] font-semibold text-sm sm:text-base transition-all duration-300 hover:bg-[#00f2ff]/10 hover:border-[#00f2ff]/40"
          >
            Watch Demo
          </Link>
        </div>
      </div>

      {/* Stats overlay */}
      <StatsOverlay scanProgress={scanProgress} />

      {/* Scroll indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 animate-bounce opacity-40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}

export default ForestScanHero;
