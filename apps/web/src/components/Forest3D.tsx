/**
 * Forest3D — Stunning WebGL 3D forest visualization for the landing page hero.
 *
 * Uses Three.js with:
 * - Procedural hilly terrain with displacement
 * - ~500 instanced trees (spruce, pine, birch) with health states
 * - Thermal heatmap ground overlay
 * - Animated drone on a lawnmower survey path
 * - Particle effects (pollen / data points)
 * - Slow orbiting camera
 * - Golden Swedish summer lighting with fog
 * - Bloom-like glow on stressed/infested trees via emissive materials
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ─── Types for tree placement ───
interface TreeInstance {
  x: number;
  z: number;
  y: number; // ground height at position
  type: 'spruce' | 'pine' | 'birch';
  height: number; // 15-30
  health: 'healthy' | 'stressed' | 'infested';
}

// ─── Simplex-ish noise (fast 2D) ───
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function smoothNoise(x: number, z: number, scale: number, seed: number): number {
  const sx = x / scale;
  const sz = z / scale;
  const ix = Math.floor(sx);
  const iz = Math.floor(sz);
  const fx = sx - ix;
  const fz = sz - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const hash = (a: number, b: number) => {
    const h = ((a * 127 + b * 311 + seed * 997) & 0x7fffffff) % 1000;
    return h / 1000;
  };

  const v00 = hash(ix, iz);
  const v10 = hash(ix + 1, iz);
  const v01 = hash(ix, iz + 1);
  const v11 = hash(ix + 1, iz + 1);

  return (v00 * (1 - ux) + v10 * ux) * (1 - uz) + (v01 * (1 - ux) + v11 * ux) * uz;
}

function terrainHeight(x: number, z: number): number {
  return (
    smoothNoise(x, z, 60, 42) * 18 +
    smoothNoise(x, z, 30, 13) * 8 +
    smoothNoise(x, z, 12, 7) * 3
  );
}

export default function Forest3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  const initScene = useCallback(async () => {
    if (!containerRef.current) return;

    // Lazy-load Three.js
    const THREE = await import('three');

    // Check WebGL
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // ─── Renderer ───
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = false; // skip for performance
    container.appendChild(renderer.domElement);

    // ─── Scene ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030d05');
    scene.fog = new THREE.FogExp2('#071a0a', 0.0045);

    // ─── Camera ───
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 500);
    camera.position.set(80, 55, 80);
    camera.lookAt(0, 5, 0);

    // ─── Lighting ───
    // Ambient for base visibility
    const ambient = new THREE.AmbientLight('#2a4a2e', 0.6);
    scene.add(ambient);

    // Golden Swedish summer sun — low angle
    const sun = new THREE.DirectionalLight('#ffe4a0', 1.8);
    sun.position.set(-60, 35, -40);
    scene.add(sun);

    // Fill light from opposite side
    const fill = new THREE.DirectionalLight('#8ecaff', 0.3);
    fill.position.set(40, 20, 60);
    scene.add(fill);

    // Warm rim from behind
    const rim = new THREE.DirectionalLight('#ffd080', 0.4);
    rim.position.set(0, 10, -80);
    scene.add(rim);

    // ─── Terrain ───
    const terrainSize = 200;
    const terrainSegments = 128;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posArr = terrainGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < posArr.length; i += 3) {
      const x = posArr[i];
      const z = posArr[i + 2];
      posArr[i + 1] = terrainHeight(x, z);
    }
    terrainGeo.computeVertexNormals();

    // Color the terrain vertices — base green with thermal hotspots
    const colors = new Float32Array((posArr.length / 3) * 3);
    for (let i = 0; i < posArr.length; i += 3) {
      const vi = i / 3;
      const x = posArr[i];
      const z = posArr[i + 2];

      // Base dark forest green
      let r = 0.02 + smoothNoise(x, z, 20, 99) * 0.03;
      let g = 0.08 + smoothNoise(x, z, 15, 55) * 0.06;
      let b = 0.02;

      // Thermal hotspot overlay (beetle zones)
      const heatZones = [
        { cx: -15, cz: 10, radius: 18, intensity: 0.7 },
        { cx: 20, cz: -25, radius: 12, intensity: 0.5 },
        { cx: -35, cz: -15, radius: 10, intensity: 0.4 },
      ];
      for (const zone of heatZones) {
        const dist = Math.sqrt((x - zone.cx) ** 2 + (z - zone.cz) ** 2);
        if (dist < zone.radius) {
          const t = (1 - dist / zone.radius) * zone.intensity;
          r += t * 0.4;
          g += t * 0.12;
          b -= t * 0.01;
        }
      }

      colors[vi * 3] = Math.min(r, 1);
      colors[vi * 3 + 1] = Math.min(g, 1);
      colors[vi * 3 + 2] = Math.max(b, 0);
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrainMesh);

    // ─── Generate tree positions ───
    const rng = seededRandom(12345);
    const trees: TreeInstance[] = [];
    const treeCount = 500;
    const halfSize = terrainSize / 2 - 10;

    for (let i = 0; i < treeCount; i++) {
      const x = (rng() - 0.5) * 2 * halfSize;
      const z = (rng() - 0.5) * 2 * halfSize;
      const y = terrainHeight(x, z);

      // Tree type distribution: 50% spruce, 30% pine, 20% birch
      const typeRoll = rng();
      const type: TreeInstance['type'] = typeRoll < 0.5 ? 'spruce' : typeRoll < 0.8 ? 'pine' : 'birch';
      const height = 15 + rng() * 15;

      // Health: most healthy, some stressed near heat zones, some infested
      let health: TreeInstance['health'] = 'healthy';
      const heatZones = [
        { cx: -15, cz: 10, radius: 20 },
        { cx: 20, cz: -25, radius: 14 },
        { cx: -35, cz: -15, radius: 12 },
      ];
      for (const zone of heatZones) {
        const dist = Math.sqrt((x - zone.cx) ** 2 + (z - zone.cz) ** 2);
        if (dist < zone.radius * 0.5) {
          health = 'infested';
        } else if (dist < zone.radius * 0.85) {
          health = rng() < 0.6 ? 'stressed' : 'healthy';
        }
      }

      trees.push({ x, z, y, type, height, health });
    }

    // ─── Create tree meshes using InstancedMesh ───
    // We create separate instanced meshes for each tree-type + part combination

    // Helper to create a merged "tree" via instanced meshes
    const treeGroups: { mesh: THREE.InstancedMesh; instances: { matrix: THREE.Matrix4 }[] }[] = [];

    // --- SPRUCE (conical) ---
    const spruces = trees.filter((t) => t.type === 'spruce');
    if (spruces.length > 0) {
      // Trunk
      const sTrunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 5, 5);
      sTrunkGeo.translate(0, 2.5, 0);
      const sTrunkMat = new THREE.MeshLambertMaterial({ color: '#3d2b1f' });
      const sTrunkMesh = new THREE.InstancedMesh(sTrunkGeo, sTrunkMat, spruces.length);

      // Crown — stack of 3 cones
      const sCrownGeo = new THREE.ConeGeometry(4.5, 10, 6);
      sCrownGeo.translate(0, 12, 0);

      // We need separate instanced meshes per health state for color
      const healthGroups = { healthy: [] as number[], stressed: [] as number[], infested: [] as number[] };
      spruces.forEach((t, i) => healthGroups[t.health].push(i));

      // All trunks share same material
      const dummy = new THREE.Object3D();
      spruces.forEach((t, i) => {
        const scale = t.height / 25;
        dummy.position.set(t.x, t.y, t.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        sTrunkMesh.setMatrixAt(i, dummy.matrix);
      });
      sTrunkMesh.instanceMatrix.needsUpdate = true;
      scene.add(sTrunkMesh);

      // Crown per health state
      for (const [health, indices] of Object.entries(healthGroups)) {
        if (indices.length === 0) continue;
        let color: string;
        let emissive: string;
        let emissiveIntensity: number;
        if (health === 'healthy') {
          color = '#1a4a20';
          emissive = '#000000';
          emissiveIntensity = 0;
        } else if (health === 'stressed') {
          color = '#8a7a20';
          emissive = '#f59e0b';
          emissiveIntensity = 0.3;
        } else {
          color = '#6a3020';
          emissive = '#ef4444';
          emissiveIntensity = 0.5;
        }
        const mat = new THREE.MeshLambertMaterial({
          color,
          emissive,
          emissiveIntensity,
        });
        const mesh = new THREE.InstancedMesh(sCrownGeo, mat, indices.length);
        indices.forEach((srcIdx, dstIdx) => {
          const t = spruces[srcIdx];
          const scale = t.height / 25;
          dummy.position.set(t.x, t.y, t.z);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(dstIdx, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);

        if (health !== 'healthy') {
          treeGroups.push({
            mesh,
            instances: indices.map((srcIdx) => {
              const t = spruces[srcIdx];
              const scale = t.height / 25;
              dummy.position.set(t.x, t.y, t.z);
              dummy.scale.set(scale, scale, scale);
              dummy.updateMatrix();
              return { matrix: dummy.matrix.clone() };
            }),
          });
        }
      }
    }

    // --- PINE (cylinder trunk + sphere crown) ---
    const pines = trees.filter((t) => t.type === 'pine');
    if (pines.length > 0) {
      const pTrunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 8, 5);
      pTrunkGeo.translate(0, 4, 0);
      const pTrunkMat = new THREE.MeshLambertMaterial({ color: '#5a3a20' });
      const pTrunkMesh = new THREE.InstancedMesh(pTrunkGeo, pTrunkMat, pines.length);

      const pCrownGeo = new THREE.SphereGeometry(3.5, 6, 5);
      pCrownGeo.translate(0, 11, 0);
      // Scale Y to make it slightly flattened
      pCrownGeo.scale(1, 0.7, 1);

      const dummy = new THREE.Object3D();
      pines.forEach((t, i) => {
        const scale = t.height / 25;
        dummy.position.set(t.x, t.y, t.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        pTrunkMesh.setMatrixAt(i, dummy.matrix);
      });
      pTrunkMesh.instanceMatrix.needsUpdate = true;
      scene.add(pTrunkMesh);

      const healthGroups = { healthy: [] as number[], stressed: [] as number[], infested: [] as number[] };
      pines.forEach((t, i) => healthGroups[t.health].push(i));

      for (const [health, indices] of Object.entries(healthGroups)) {
        if (indices.length === 0) continue;
        let color: string, emissive: string, emissiveIntensity: number;
        if (health === 'healthy') {
          color = '#1e5528';
          emissive = '#000000';
          emissiveIntensity = 0;
        } else if (health === 'stressed') {
          color = '#7a7020';
          emissive = '#f59e0b';
          emissiveIntensity = 0.3;
        } else {
          color = '#703828';
          emissive = '#ef4444';
          emissiveIntensity = 0.5;
        }
        const mat = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity });
        const mesh = new THREE.InstancedMesh(pCrownGeo, mat, indices.length);
        indices.forEach((srcIdx, dstIdx) => {
          const t = pines[srcIdx];
          const scale = t.height / 25;
          dummy.position.set(t.x, t.y, t.z);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(dstIdx, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);

        if (health !== 'healthy') {
          treeGroups.push({
            mesh,
            instances: indices.map((srcIdx) => {
              const t = pines[srcIdx];
              const scale = t.height / 25;
              dummy.position.set(t.x, t.y, t.z);
              dummy.scale.set(scale, scale, scale);
              dummy.updateMatrix();
              return { matrix: dummy.matrix.clone() };
            }),
          });
        }
      }
    }

    // --- BIRCH (white trunk + light green crown) ---
    const birches = trees.filter((t) => t.type === 'birch');
    if (birches.length > 0) {
      const bTrunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 7, 5);
      bTrunkGeo.translate(0, 3.5, 0);
      const bTrunkMat = new THREE.MeshLambertMaterial({ color: '#e8ddd0' }); // white birch bark
      const bTrunkMesh = new THREE.InstancedMesh(bTrunkGeo, bTrunkMat, birches.length);

      const bCrownGeo = new THREE.SphereGeometry(3, 6, 5);
      bCrownGeo.translate(0, 10, 0);

      const dummy = new THREE.Object3D();
      birches.forEach((t, i) => {
        const scale = t.height / 25;
        dummy.position.set(t.x, t.y, t.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bTrunkMesh.setMatrixAt(i, dummy.matrix);
      });
      bTrunkMesh.instanceMatrix.needsUpdate = true;
      scene.add(bTrunkMesh);

      const healthGroups = { healthy: [] as number[], stressed: [] as number[], infested: [] as number[] };
      birches.forEach((t, i) => healthGroups[t.health].push(i));

      for (const [health, indices] of Object.entries(healthGroups)) {
        if (indices.length === 0) continue;
        let color: string, emissive: string, emissiveIntensity: number;
        if (health === 'healthy') {
          color = '#4a8a30';
          emissive = '#000000';
          emissiveIntensity = 0;
        } else if (health === 'stressed') {
          color = '#8a8a20';
          emissive = '#f59e0b';
          emissiveIntensity = 0.25;
        } else {
          color = '#7a4030';
          emissive = '#ef4444';
          emissiveIntensity = 0.45;
        }
        const mat = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity });
        const mesh = new THREE.InstancedMesh(bCrownGeo, mat, indices.length);
        indices.forEach((srcIdx, dstIdx) => {
          const t = birches[srcIdx];
          const scale = t.height / 25;
          dummy.position.set(t.x, t.y, t.z);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(dstIdx, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);

        if (health !== 'healthy') {
          treeGroups.push({
            mesh,
            instances: indices.map((srcIdx) => {
              const t = birches[srcIdx];
              const scale = t.height / 25;
              dummy.position.set(t.x, t.y, t.z);
              dummy.scale.set(scale, scale, scale);
              dummy.updateMatrix();
              return { matrix: dummy.matrix.clone() };
            }),
          });
        }
      }
    }

    // ─── Drone ───
    const droneGroup = new THREE.Group();
    // Body
    const droneBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.4, 1.5),
      new THREE.MeshLambertMaterial({ color: '#e0e0e0', emissive: '#ffffff', emissiveIntensity: 0.15 })
    );
    droneGroup.add(droneBody);
    // Arms
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.8, 4),
        new THREE.MeshLambertMaterial({ color: '#888' })
      );
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = angle;
      arm.position.set(Math.cos(angle) * 0.8, 0, Math.sin(angle) * 0.8);
      droneGroup.add(arm);
      // Rotor disc
      const rotor = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 8),
        new THREE.MeshLambertMaterial({ color: '#aaa', transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      rotor.rotation.x = -Math.PI / 2;
      rotor.position.set(Math.cos(angle) * 1.2, 0.2, Math.sin(angle) * 1.2);
      droneGroup.add(rotor);
    }
    // LED indicator
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#22c55e' })
    );
    led.position.set(0, -0.2, 0.6);
    droneGroup.add(led);

    droneGroup.scale.setScalar(1.8);
    scene.add(droneGroup);

    // Drone scan beam (cone of light below drone)
    const beamGeo = new THREE.ConeGeometry(3, 12, 8, 1, true);
    beamGeo.translate(0, -6, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#22ff88',
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    droneGroup.add(beam);

    // Lawnmower flight path
    const dronePathPoints: { x: number; z: number }[] = [];
    const rows = 8;
    const sweepHalf = 70;
    for (let row = 0; row < rows; row++) {
      const z = -sweepHalf + (row / (rows - 1)) * sweepHalf * 2;
      if (row % 2 === 0) {
        dronePathPoints.push({ x: -sweepHalf, z });
        dronePathPoints.push({ x: sweepHalf, z });
      } else {
        dronePathPoints.push({ x: sweepHalf, z });
        dronePathPoints.push({ x: -sweepHalf, z });
      }
    }

    // ─── Particles (pollen / data points) ───
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particlePhases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * terrainSize * 0.8;
      particlePositions[i * 3 + 1] = 15 + Math.random() * 25;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * terrainSize * 0.8;
      particleSpeeds[i] = 0.02 + Math.random() * 0.04;
      particlePhases[i] = Math.random() * Math.PI * 2;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: '#aaffaa',
      size: 0.6,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── Ground glow rings around heat zones ───
    const heatZones = [
      { cx: -15, cz: 10, radius: 18 },
      { cx: 20, cz: -25, radius: 12 },
      { cx: -35, cz: -15, radius: 10 },
    ];
    const glowRings: THREE.Mesh[] = [];
    for (const zone of heatZones) {
      const ringGeo = new THREE.RingGeometry(zone.radius * 0.3, zone.radius, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#ff4400',
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(zone.cx, terrainHeight(zone.cx, zone.cz) + 0.5, zone.cz);
      scene.add(ring);
      glowRings.push(ring);
    }

    // ─── Animation loop ───
    let animId: number;
    let time = 0;
    const clock = { last: performance.now() };

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - clock.last) / 1000, 0.05); // cap delta
      clock.last = now;
      time += dt;

      // Camera orbit
      const orbitRadius = 100;
      const orbitSpeed = 0.03;
      const angle = time * orbitSpeed;
      camera.position.x = Math.cos(angle) * orbitRadius;
      camera.position.z = Math.sin(angle) * orbitRadius;
      camera.position.y = 50 + Math.sin(time * 0.05) * 5;
      camera.lookAt(0, 8, 0);

      // Drone movement along lawnmower path
      const totalPathLen = dronePathPoints.length - 1;
      const droneSpeed = 0.06;
      const droneT = (time * droneSpeed) % totalPathLen;
      const segIndex = Math.floor(droneT);
      const segFrac = droneT - segIndex;
      const p0 = dronePathPoints[segIndex % dronePathPoints.length];
      const p1 = dronePathPoints[(segIndex + 1) % dronePathPoints.length];
      const droneX = p0.x + (p1.x - p0.x) * segFrac;
      const droneZ = p0.z + (p1.z - p0.z) * segFrac;
      const droneY = terrainHeight(droneX, droneZ) + 30;
      droneGroup.position.set(droneX, droneY, droneZ);
      // Slight tilt in movement direction
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      droneGroup.rotation.y = Math.atan2(dx, dz);
      droneGroup.rotation.z = Math.sin(time * 2) * 0.03; // gentle sway

      // Pulse emissive on stressed/infested trees
      const pulseIntensity = 0.3 + Math.sin(time * 2.5) * 0.2;
      const pulseInfested = 0.4 + Math.sin(time * 3) * 0.25;
      for (const group of treeGroups) {
        const mat = group.mesh.material as THREE.MeshLambertMaterial;
        if (mat.emissive.getHex() === 0xf59e0b) {
          mat.emissiveIntensity = pulseIntensity;
        } else if (mat.emissive.getHex() === 0xef4444) {
          mat.emissiveIntensity = pulseInfested;
        }
      }

      // Glow rings pulse
      for (const ring of glowRings) {
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(time * 1.5) * 0.04;
      }

      // Particles float upward and drift
      const posAttr = particles.geometry.attributes.position;
      const pArr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pArr[i * 3 + 1] += particleSpeeds[i];
        pArr[i * 3] += Math.sin(time + particlePhases[i]) * 0.02;
        pArr[i * 3 + 2] += Math.cos(time * 0.7 + particlePhases[i]) * 0.02;
        if (pArr[i * 3 + 1] > 45) {
          pArr[i * 3 + 1] = 10 + Math.random() * 5;
          pArr[i * 3] = (Math.random() - 0.5) * terrainSize * 0.8;
          pArr[i * 3 + 2] = (Math.random() - 0.5) * terrainSize * 0.8;
        }
      }
      posAttr.needsUpdate = true;

      // Scan beam pulse
      beamMat.opacity = 0.04 + Math.sin(time * 4) * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // ─── Resize handler ───
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ─── Cleanup ───
    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      renderer.domElement.remove();
      // Dispose geometries and materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, []);

  useEffect(() => {
    initScene();
    return () => {
      cleanupRef.current?.();
    };
  }, [initScene]);

  if (!webglSupported) {
    // Fallback: CSS animated gradient
    return (
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#030d05] via-[#0a2a10] to-[#041208]">
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 40%, rgba(34,197,94,0.1) 0%, transparent 50%)',
              animation: 'pulse 4s ease-in-out infinite',
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[var(--text3)] text-sm font-mono">3D-vy ej tillgänglig — WebGL krävs</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
