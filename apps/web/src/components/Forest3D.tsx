/**
 * Forest3D — Photorealistic WebGL 3D forest visualization for the landing page hero.
 *
 * Uses Three.js with:
 * - Procedural hilly terrain with vertex-colored forest floor
 * - ~400 instanced trees (spruce, pine, birch) with realistic geometry
 * - Layered spruce crowns, irregular pine canopies, clustered birch foliage
 * - Realistic stressed/infested trees: brown needles, bare branches, bore-dust particles
 * - Scattered rocks on forest floor
 * - Swedish golden-hour lighting with hemisphere + warm directional
 * - Exponential fog with blue-purple distance tint
 * - Detailed drone with spinning propellers, green scan line, trail
 * - Slow cinematic camera orbit with initial focus on infested area
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type * as THREE from 'three';

// ─── Types ───
interface TreeInstance {
  x: number;
  z: number;
  y: number;
  type: 'spruce' | 'pine' | 'birch';
  height: number;
  health: 'healthy' | 'stressed' | 'infested';
  lean: number;
  leanDir: number;
  rotY: number;
}

// ─── Seeded RNG ───
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─── Smooth noise ───
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
    smoothNoise(x, z, 60, 42) * 22 +
    smoothNoise(x, z, 30, 13) * 10 +
    smoothNoise(x, z, 12, 7) * 4 +
    smoothNoise(x, z, 6, 3) * 1.5
  );
}

// ─── Heat zones (beetle damage) ───
const HEAT_ZONES = [
  { cx: -15, cz: 10, radius: 20, intensity: 0.7 },
  { cx: 20, cz: -25, radius: 14, intensity: 0.5 },
  { cx: -35, cz: -15, radius: 12, intensity: 0.4 },
];

export default function Forest3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  const initScene = useCallback(async () => {
    if (!containerRef.current) return;

    const THREE = await import('three');

    // WebGL check
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
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ─── Scene ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020a04');
    scene.fog = new THREE.FogExp2('#0a1520', 0.005);

    // ─── Sky dome ───
    const skyGeo = new THREE.SphereGeometry(250, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({
      color: '#0a0e1a',
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // ─── Camera ───
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(80, 55, 80);
    camera.lookAt(-15, 10, 10);

    // ─── Lighting — Swedish golden hour ───
    // Primary sun — warm golden, low angle (15 degrees from horizon)
    const sun = new THREE.DirectionalLight('#FFE4B5', 2.0);
    const sunAngle = (15 * Math.PI) / 180;
    sun.position.set(-80, Math.sin(sunAngle) * 100, -50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    scene.add(sun);

    // Ambient — very subtle dark blue-green
    const ambient = new THREE.AmbientLight('#0a1a0f', 0.3);
    scene.add(ambient);

    // Hemisphere light — sky/ground
    const hemi = new THREE.HemisphereLight('#87CEEB', '#2d1b00', 0.4);
    scene.add(hemi);

    // Warm point lights near infested areas (simulating heat)
    for (const zone of HEAT_ZONES) {
      const warmLight = new THREE.PointLight('#ff6030', 0.6, zone.radius * 3);
      warmLight.position.set(zone.cx, terrainHeight(zone.cx, zone.cz) + 2, zone.cz);
      scene.add(warmLight);
    }

    // ─── Terrain ───
    const terrainSize = 220;
    const terrainSegments = 150;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posArr = terrainGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < posArr.length; i += 3) {
      posArr[i + 1] = terrainHeight(posArr[i], posArr[i + 2]);
    }
    terrainGeo.computeVertexNormals();

    // Vertex colors — realistic forest floor
    const vertCount = posArr.length / 3;
    const colors = new Float32Array(vertCount * 3);
    for (let i = 0; i < posArr.length; i += 3) {
      const vi = i / 3;
      const x = posArr[i];
      const z = posArr[i + 2];

      // Base dark brown soil
      const soilNoise = smoothNoise(x, z, 8, 77);
      const mossNoise = smoothNoise(x, z, 15, 33);
      const detailNoise = smoothNoise(x, z, 4, 51);

      // Mix of dark brown earth and green moss patches
      let r = 0.04 + soilNoise * 0.04 + detailNoise * 0.02;
      let g = 0.06 + mossNoise * 0.08 + detailNoise * 0.03;
      let b = 0.02 + detailNoise * 0.01;

      // Lighter moss patches
      if (mossNoise > 0.6) {
        const t = (mossNoise - 0.6) * 2.5;
        r += t * 0.02;
        g += t * 0.1;
        b += t * 0.01;
      }

      // Dark leaf litter patches
      if (soilNoise < 0.3) {
        const t = (0.3 - soilNoise) * 2;
        r += t * 0.03;
        g -= t * 0.01;
      }

      // Beetle damage zones — red/orange underglow on ground
      for (const zone of HEAT_ZONES) {
        const dist = Math.sqrt((x - zone.cx) ** 2 + (z - zone.cz) ** 2);
        if (dist < zone.radius) {
          const t = (1 - dist / zone.radius) ** 2 * zone.intensity;
          r += t * 0.25;
          g += t * 0.06;
          b -= t * 0.01;
        }
      }

      colors[vi * 3] = Math.min(Math.max(r, 0), 1);
      colors[vi * 3 + 1] = Math.min(Math.max(g, 0), 1);
      colors[vi * 3 + 2] = Math.min(Math.max(b, 0), 1);
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // ─── Scattered rocks ───
    const rockGeo = new THREE.DodecahedronGeometry(0.4, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#3a3a38', roughness: 0.9, metalness: 0.1 });
    const rockCount = 80;
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    const rockDummy = new THREE.Object3D();
    const rockRng = seededRandom(777);
    for (let i = 0; i < rockCount; i++) {
      const rx = (rockRng() - 0.5) * terrainSize * 0.85;
      const rz = (rockRng() - 0.5) * terrainSize * 0.85;
      const ry = terrainHeight(rx, rz) - 0.1;
      const sc = 0.3 + rockRng() * 0.8;
      rockDummy.position.set(rx, ry, rz);
      rockDummy.scale.set(sc, sc * (0.4 + rockRng() * 0.6), sc);
      rockDummy.rotation.set(rockRng() * Math.PI, rockRng() * Math.PI, 0);
      rockDummy.updateMatrix();
      rockMesh.setMatrixAt(i, rockDummy.matrix);
    }
    rockMesh.instanceMatrix.needsUpdate = true;
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    scene.add(rockMesh);

    // ─── Generate tree data ───
    const rng = seededRandom(12345);
    const trees: TreeInstance[] = [];
    const treeCount = 400;
    const halfSize = terrainSize / 2 - 12;

    for (let i = 0; i < treeCount; i++) {
      const x = (rng() - 0.5) * 2 * halfSize;
      const z = (rng() - 0.5) * 2 * halfSize;
      const y = terrainHeight(x, z);

      const typeRoll = rng();
      const type: TreeInstance['type'] = typeRoll < 0.5 ? 'spruce' : typeRoll < 0.8 ? 'pine' : 'birch';
      const baseHeight = type === 'spruce' ? 22 : type === 'pine' ? 20 : 16;
      const heightVar = baseHeight * (0.8 + rng() * 0.4); // +/- 20%

      let health: TreeInstance['health'] = 'healthy';
      for (const zone of HEAT_ZONES) {
        const dist = Math.sqrt((x - zone.cx) ** 2 + (z - zone.cz) ** 2);
        if (dist < zone.radius * 0.45) {
          health = 'infested';
        } else if (dist < zone.radius * 0.85) {
          health = rng() < 0.55 ? 'stressed' : 'healthy';
        }
      }

      const lean = rng() * 0.087; // 0-5 degrees
      const leanDir = rng() * Math.PI * 2;
      const rotY = rng() * Math.PI * 2;

      trees.push({ x, z, y, type, height: heightVar, health, lean, leanDir, rotY });
    }

    // ─── Helper: set transform on dummy with lean ───
    const dummy = new THREE.Object3D();
    function setTreeTransform(t: TreeInstance, scale: number, yOffset = 0) {
      dummy.position.set(t.x, t.y + yOffset, t.z);
      dummy.rotation.set(
        Math.sin(t.leanDir) * t.lean,
        t.rotY,
        Math.cos(t.leanDir) * t.lean
      );
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
    }

    // ─── Track animated meshes for stress pulsing ───
    const stressMeshes: { mesh: THREE.InstancedMesh; healthType: 'stressed' | 'infested' }[] = [];

    // ═══════════════════════════════════════
    // SPRUCE — Layered cone segments with droop
    // ═══════════════════════════════════════
    const spruces = trees.filter((t) => t.type === 'spruce');
    if (spruces.length > 0) {
      // Tapered trunk
      const sTrunkGeo = new THREE.CylinderGeometry(0.2, 0.5, 6, 6);
      sTrunkGeo.translate(0, 3, 0);
      const sTrunkMat = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.85, metalness: 0.0 });
      const sTrunkMesh = new THREE.InstancedMesh(sTrunkGeo, sTrunkMat, spruces.length);
      sTrunkMesh.castShadow = true;

      spruces.forEach((t, i) => {
        const scale = t.height / 22;
        setTreeTransform(t, scale);
        sTrunkMesh.setMatrixAt(i, dummy.matrix);
      });
      sTrunkMesh.instanceMatrix.needsUpdate = true;
      scene.add(sTrunkMesh);

      // 4 layered cone segments per spruce, instanced separately
      const layerConfigs = [
        { yBase: 5, radius: 5.0, h: 5, greenBase: '#1a4a20' },
        { yBase: 8, radius: 4.0, h: 5, greenBase: '#1e5525' },
        { yBase: 11, radius: 3.0, h: 4.5, greenBase: '#22602a' },
        { yBase: 14, radius: 1.8, h: 3.5, greenBase: '#286b30' },
      ];

      const healthGroups = { healthy: [] as number[], stressed: [] as number[], infested: [] as number[] };
      spruces.forEach((t, i) => healthGroups[t.health].push(i));

      for (const layer of layerConfigs) {
        const coneGeo = new THREE.ConeGeometry(layer.radius, layer.h, 7);
        coneGeo.translate(0, layer.yBase + layer.h / 2, 0);
        // Add slight droop by scaling bottom vertices outward
        const conePos = coneGeo.attributes.position.array as Float32Array;
        for (let v = 0; v < conePos.length; v += 3) {
          const vy = conePos[v + 1] - layer.yBase;
          if (vy < layer.h * 0.3) {
            const droopFactor = 1 + (1 - vy / (layer.h * 0.3)) * 0.15;
            conePos[v] *= droopFactor;
            conePos[v + 2] *= droopFactor;
          }
        }
        coneGeo.computeVertexNormals();

        for (const [health, indices] of Object.entries(healthGroups)) {
          if (indices.length === 0) continue;

          let color: string;
          let opacity = 1.0;
          let transparent = false;

          if (health === 'healthy') {
            color = layer.greenBase;
          } else if (health === 'stressed') {
            // Yellowing needles
            const c = new THREE.Color(layer.greenBase);
            c.lerp(new THREE.Color('#8a8a20'), 0.5);
            color = '#' + c.getHexString();
          } else {
            // Dead brown needles, slightly transparent
            color = '#4a3020';
            opacity = 0.7;
            transparent = true;
          }

          const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.8,
            metalness: 0.0,
            transparent,
            opacity,
          });
          const mesh = new THREE.InstancedMesh(coneGeo, mat, indices.length);
          mesh.castShadow = true;

          indices.forEach((srcIdx, dstIdx) => {
            const t = spruces[srcIdx];
            const scale = t.height / 22;
            // Slight random rotation per layer for organic look
            const savedRotY = t.rotY;
            (t as any).rotY = t.rotY + layer.yBase * 0.1;
            setTreeTransform(t, scale);
            (t as any).rotY = savedRotY;
            mesh.setMatrixAt(dstIdx, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          scene.add(mesh);

          if (health !== 'healthy') {
            stressMeshes.push({ mesh, healthType: health as 'stressed' | 'infested' });
          }
        }
      }

      // Bare branches on infested spruces (thin cylinders poking through)
      const infestedSpruces = spruces.filter((t) => t.health === 'infested');
      if (infestedSpruces.length > 0) {
        const branchGeo = new THREE.CylinderGeometry(0.05, 0.08, 3, 3);
        branchGeo.translate(0, 1.5, 0);
        branchGeo.rotateZ(Math.PI / 3);
        const branchMat = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.9 });
        const branchesPerTree = 5;
        const branchMesh = new THREE.InstancedMesh(branchGeo, branchMat, infestedSpruces.length * branchesPerTree);

        let bIdx = 0;
        for (const t of infestedSpruces) {
          const scale = t.height / 22;
          for (let b = 0; b < branchesPerTree; b++) {
            const bY = 6 + b * 2.5;
            const bAngle = t.rotY + b * 1.3;
            const bRadius = 1.5;
            dummy.position.set(
              t.x + Math.cos(bAngle) * bRadius * scale,
              t.y + bY * scale,
              t.z + Math.sin(bAngle) * bRadius * scale
            );
            dummy.rotation.set(0, bAngle, Math.PI / 4 + (b % 2) * 0.3);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            branchMesh.setMatrixAt(bIdx++, dummy.matrix);
          }
        }
        branchMesh.instanceMatrix.needsUpdate = true;
        scene.add(branchMesh);
      }
    }

    // ═══════════════════════════════════════
    // PINE — Irregular crown with multiple merged sphere clusters
    // ═══════════════════════════════════════
    const pines = trees.filter((t) => t.type === 'pine');
    if (pines.length > 0) {
      // Thin tapered trunk
      const pTrunkGeo = new THREE.CylinderGeometry(0.15, 0.4, 10, 6);
      pTrunkGeo.translate(0, 5, 0);
      const pTrunkMat = new THREE.MeshStandardMaterial({ color: '#5a3a20', roughness: 0.9, metalness: 0.0 });
      const pTrunkMesh = new THREE.InstancedMesh(pTrunkGeo, pTrunkMat, pines.length);
      pTrunkMesh.castShadow = true;

      pines.forEach((t, i) => {
        const scale = t.height / 20;
        setTreeTransform(t, scale);
        pTrunkMesh.setMatrixAt(i, dummy.matrix);
      });
      pTrunkMesh.instanceMatrix.needsUpdate = true;
      scene.add(pTrunkMesh);

      // Crown: 3 sphere clusters at different heights
      const clusterConfigs = [
        { yOff: 9, radius: 3.0, scaleY: 0.6 },
        { yOff: 12, radius: 2.5, scaleY: 0.55 },
        { yOff: 14, radius: 1.8, scaleY: 0.5 },
      ];

      const healthGroups = { healthy: [] as number[], stressed: [] as number[], infested: [] as number[] };
      pines.forEach((t, i) => healthGroups[t.health].push(i));

      for (const cluster of clusterConfigs) {
        const sphereGeo = new THREE.SphereGeometry(cluster.radius, 7, 5);
        sphereGeo.translate(0, cluster.yOff, 0);
        sphereGeo.scale(1, cluster.scaleY, 1);
        // Jitter vertices for organic feel
        const sp = sphereGeo.attributes.position.array as Float32Array;
        for (let v = 0; v < sp.length; v += 3) {
          sp[v] += (Math.random() - 0.5) * 0.4;
          sp[v + 1] += (Math.random() - 0.5) * 0.3;
          sp[v + 2] += (Math.random() - 0.5) * 0.4;
        }
        sphereGeo.computeVertexNormals();

        for (const [health, indices] of Object.entries(healthGroups)) {
          if (indices.length === 0) continue;

          let color: string;
          let opacity = 1.0;
          let transparent = false;

          if (health === 'healthy') {
            color = '#1e5528';
          } else if (health === 'stressed') {
            color = '#6a7a20';
          } else {
            color = '#4a3525';
            opacity = 0.7;
            transparent = true;
          }

          const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.8,
            metalness: 0.0,
            transparent,
            opacity,
          });
          const mesh = new THREE.InstancedMesh(sphereGeo, mat, indices.length);
          mesh.castShadow = true;

          indices.forEach((srcIdx, dstIdx) => {
            const t = pines[srcIdx];
            const scale = t.height / 20;
            // Offset each cluster slightly for irregularity
            const ox = Math.sin(t.rotY + cluster.yOff) * 0.5;
            const oz = Math.cos(t.rotY + cluster.yOff) * 0.5;
            dummy.position.set(t.x + ox * scale, t.y, t.z + oz * scale);
            dummy.rotation.set(
              Math.sin(t.leanDir) * t.lean,
              t.rotY,
              Math.cos(t.leanDir) * t.lean
            );
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(dstIdx, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          scene.add(mesh);

          if (health !== 'healthy') {
            stressMeshes.push({ mesh, healthType: health as 'stressed' | 'infested' });
          }
        }
      }
    }

    // ═══════════════════════════════════════
    // BIRCH — White trunk with dark marks, clustered leaf spheres
    // ═══════════════════════════════════════
    const birches = trees.filter((t) => t.type === 'birch');
    if (birches.length > 0) {
      // White trunk with horizontal dark marks via vertex colors
      const bTrunkGeo = new THREE.CylinderGeometry(0.15, 0.35, 8, 8, 10);
      bTrunkGeo.translate(0, 4, 0);
      const bTrunkPosArr = bTrunkGeo.attributes.position.array as Float32Array;
      const bTrunkVertCount = bTrunkPosArr.length / 3;
      const bTrunkColors = new Float32Array(bTrunkVertCount * 3);
      for (let v = 0; v < bTrunkVertCount; v++) {
        const vy = bTrunkPosArr[v * 3 + 1];
        // White bark with horizontal dark streaks
        const streak = Math.sin(vy * 4) * 0.5 + 0.5;
        const isDark = streak > 0.7;
        if (isDark) {
          bTrunkColors[v * 3] = 0.15;
          bTrunkColors[v * 3 + 1] = 0.12;
          bTrunkColors[v * 3 + 2] = 0.1;
        } else {
          bTrunkColors[v * 3] = 0.88 + Math.random() * 0.05;
          bTrunkColors[v * 3 + 1] = 0.85 + Math.random() * 0.05;
          bTrunkColors[v * 3 + 2] = 0.78 + Math.random() * 0.05;
        }
      }
      bTrunkGeo.setAttribute('color', new THREE.BufferAttribute(bTrunkColors, 3));

      const bTrunkMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0.0,
      });
      const bTrunkMesh = new THREE.InstancedMesh(bTrunkGeo, bTrunkMat, birches.length);
      bTrunkMesh.castShadow = true;

      birches.forEach((t, i) => {
        const scale = t.height / 16;
        setTreeTransform(t, scale);
        bTrunkMesh.setMatrixAt(i, dummy.matrix);
      });
      bTrunkMesh.instanceMatrix.needsUpdate = true;
      scene.add(bTrunkMesh);

      // Leaf canopy: 4-5 small sphere clusters
      const healthGroups = { healthy: [] as number[], stressed: [] as number[], infested: [] as number[] };
      birches.forEach((t, i) => healthGroups[t.health].push(i));

      const leafClusters = [
        { xOff: 0, yOff: 10, zOff: 0, r: 2.0 },
        { xOff: 1.5, yOff: 11, zOff: 0.5, r: 1.6 },
        { xOff: -1.2, yOff: 10.5, zOff: 1.0, r: 1.5 },
        { xOff: 0.5, yOff: 12, zOff: -1.0, r: 1.3 },
        { xOff: -0.5, yOff: 9, zOff: -0.8, r: 1.4 },
      ];

      for (const lc of leafClusters) {
        const lcGeo = new THREE.SphereGeometry(lc.r, 6, 5);
        lcGeo.translate(lc.xOff, lc.yOff, lc.zOff);
        // Jitter for organic shape
        const lcPos = lcGeo.attributes.position.array as Float32Array;
        for (let v = 0; v < lcPos.length; v += 3) {
          lcPos[v] += (Math.random() - 0.5) * 0.3;
          lcPos[v + 1] += (Math.random() - 0.5) * 0.2;
          lcPos[v + 2] += (Math.random() - 0.5) * 0.3;
        }
        lcGeo.computeVertexNormals();

        for (const [health, indices] of Object.entries(healthGroups)) {
          if (indices.length === 0) continue;

          let color: string;
          let opacity = 1.0;
          let transparent = false;

          if (health === 'healthy') {
            color = '#7aaa40'; // light yellow-green
          } else if (health === 'stressed') {
            color = '#9a9a25';
          } else {
            color = '#6a4a28';
            opacity = 0.65;
            transparent = true;
          }

          const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.75,
            metalness: 0.0,
            transparent,
            opacity,
          });
          const mesh = new THREE.InstancedMesh(lcGeo, mat, indices.length);
          mesh.castShadow = true;

          indices.forEach((srcIdx, dstIdx) => {
            const t = birches[srcIdx];
            const scale = t.height / 16;
            setTreeTransform(t, scale);
            mesh.setMatrixAt(dstIdx, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          scene.add(mesh);

          if (health !== 'healthy') {
            stressMeshes.push({ mesh, healthType: health as 'stressed' | 'infested' });
          }
        }
      }
    }

    // ─── Bore-dust particles on infested trees ───
    const infestedTrees = trees.filter((t) => t.health === 'infested');
    const dustPerTree = 15;
    const totalDust = infestedTrees.length * dustPerTree;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(totalDust * 3);
    const dustVelocities = new Float32Array(totalDust);
    const dustPhases = new Float32Array(totalDust);
    const dustTreeData: { x: number; z: number; y: number; height: number }[] = [];

    let di = 0;
    for (const t of infestedTrees) {
      for (let p = 0; p < dustPerTree; p++) {
        const px = t.x + (Math.random() - 0.5) * 3;
        const baseY = t.y + t.height * 0.3 + Math.random() * t.height * 0.5;
        const pz = t.z + (Math.random() - 0.5) * 3;
        dustPositions[di * 3] = px;
        dustPositions[di * 3 + 1] = baseY;
        dustPositions[di * 3 + 2] = pz;
        dustVelocities[di] = 0.3 + Math.random() * 0.5;
        dustPhases[di] = Math.random() * Math.PI * 2;
        dustTreeData.push({ x: t.x, z: t.z, y: t.y, height: t.height });
        di++;
      }
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: '#c4a060',
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // ─── Ground glow beneath infested areas ───
    for (const zone of HEAT_ZONES) {
      const glowGeo = new THREE.CircleGeometry(zone.radius * 0.8, 24);
      glowGeo.rotateX(-Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: '#ff3300',
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(zone.cx, terrainHeight(zone.cx, zone.cz) + 0.3, zone.cz);
      scene.add(glow);
    }

    // ─── Pollen / data particles ───
    const particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particlePhases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * terrainSize * 0.8;
      particlePositions[i * 3 + 1] = 15 + Math.random() * 25;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * terrainSize * 0.8;
      particleSpeeds[i] = 0.015 + Math.random() * 0.03;
      particlePhases[i] = Math.random() * Math.PI * 2;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#ccddaa',
      size: 0.4,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ═══════════════════════════════════════
    // DRONE — detailed with spinning propellers, scan line, trail
    // ═══════════════════════════════════════
    const droneGroup = new THREE.Group();

    // Body — slightly larger
    const droneBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.5, 2.0),
      new THREE.MeshStandardMaterial({ color: '#d0d0d0', roughness: 0.3, metalness: 0.6 })
    );
    droneGroup.add(droneBody);

    // Camera/sensor pod underneath
    const sensorPod = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 6, 6),
      new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.2, metalness: 0.8 })
    );
    sensorPod.position.set(0, -0.3, 0.3);
    droneGroup.add(sensorPod);

    // Arms + propeller discs (4 arms)
    const propellers: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const armLen = 2.2;

      // Arm
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, armLen, 4),
        new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.5, metalness: 0.4 })
      );
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = angle;
      arm.position.set(Math.cos(angle) * armLen * 0.45, 0, Math.sin(angle) * armLen * 0.45);
      droneGroup.add(arm);

      // Motor housing
      const motor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.2, 6),
        new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.3, metalness: 0.7 })
      );
      motor.position.set(Math.cos(angle) * armLen * 0.85, 0.15, Math.sin(angle) * armLen * 0.85);
      droneGroup.add(motor);

      // Propeller disc (will spin)
      const propGeo = new THREE.CircleGeometry(0.8, 3);
      const prop = new THREE.Mesh(
        propGeo,
        new THREE.MeshBasicMaterial({
          color: '#888',
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      prop.rotation.x = -Math.PI / 2;
      prop.position.set(Math.cos(angle) * armLen * 0.85, 0.28, Math.sin(angle) * armLen * 0.85);
      droneGroup.add(prop);
      propellers.push(prop);
    }

    // LED indicators
    const ledFront = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#22c55e' })
    );
    ledFront.position.set(0, -0.15, 0.9);
    droneGroup.add(ledFront);

    const ledBack = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#ef4444' })
    );
    ledBack.position.set(0, -0.15, -0.9);
    droneGroup.add(ledBack);

    droneGroup.scale.setScalar(2.0);
    scene.add(droneGroup);

    // Green laser scan line on ground
    const scanLineGeo = new THREE.PlaneGeometry(12, 0.15);
    scanLineGeo.rotateX(-Math.PI / 2);
    const scanLineMat = new THREE.MeshBasicMaterial({
      color: '#00ff66',
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const scanLine = new THREE.Mesh(scanLineGeo, scanLineMat);
    scene.add(scanLine);

    // Scan beam cone
    const beamGeo = new THREE.ConeGeometry(4, 15, 8, 1, true);
    beamGeo.translate(0, -7.5, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#22ff88',
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    droneGroup.add(beam);

    // Drone trail (line showing scanned path)
    const trailMaxPoints = 500;
    const trailPositions = new Float32Array(trailMaxPoints * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setDrawRange(0, 0);
    const trailMat = new THREE.LineBasicMaterial({
      color: '#22ff88',
      transparent: true,
      opacity: 0.15,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    let trailIndex = 0;

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

    // ─── Animation ───
    let animId: number;
    let time = 0;
    const clock = { last: performance.now() };

    // Camera cinematic: start looking at infested area, then orbit
    const cameraStartTime = 4; // seconds before orbit begins

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - clock.last) / 1000, 0.05);
      clock.last = now;
      time += dt;

      // ── Camera ──
      const orbitRadius = 95;
      const orbitSpeed = 0.02; // slower, smoother orbit

      if (time < cameraStartTime) {
        // Initial: focused on main infested area
        const introT = time / cameraStartTime;
        const eased = introT * introT * (3 - 2 * introT); // smoothstep
        camera.position.x = 60 + eased * 20;
        camera.position.z = 50 + eased * 30;
        camera.position.y = 45 + eased * 10;
        camera.lookAt(-15 + eased * 15, 8, 10 - eased * 10);
      } else {
        const orbitTime = time - cameraStartTime;
        const angle = orbitTime * orbitSpeed;
        camera.position.x = Math.cos(angle) * orbitRadius;
        camera.position.z = Math.sin(angle) * orbitRadius;
        camera.position.y = 50 + Math.sin(orbitTime * 0.04) * 6;
        camera.lookAt(0, 8, 0);
      }

      // ── Drone ──
      const totalPathLen = dronePathPoints.length - 1;
      const droneSpeed = 0.05;
      const droneT = (time * droneSpeed) % totalPathLen;
      const segIndex = Math.floor(droneT);
      const segFrac = droneT - segIndex;
      const p0 = dronePathPoints[segIndex % dronePathPoints.length];
      const p1 = dronePathPoints[(segIndex + 1) % dronePathPoints.length];
      const droneX = p0.x + (p1.x - p0.x) * segFrac;
      const droneZ = p0.z + (p1.z - p0.z) * segFrac;
      const droneY = terrainHeight(droneX, droneZ) + 28;
      droneGroup.position.set(droneX, droneY, droneZ);

      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      droneGroup.rotation.y = Math.atan2(dx, dz);
      droneGroup.rotation.z = Math.sin(time * 2) * 0.02;

      // Spin propellers
      for (const prop of propellers) {
        prop.rotation.z += dt * 30;
      }

      // Scan line on ground beneath drone
      const groundY = terrainHeight(droneX, droneZ) + 0.3;
      scanLine.position.set(droneX, groundY, droneZ);
      scanLine.rotation.y = Math.atan2(dx, dz);
      scanLineMat.opacity = 0.3 + Math.sin(time * 6) * 0.15;

      // Trail
      if (trailIndex < trailMaxPoints) {
        const tp = trailGeo.attributes.position.array as Float32Array;
        tp[trailIndex * 3] = droneX;
        tp[trailIndex * 3 + 1] = groundY + 0.5;
        tp[trailIndex * 3 + 2] = droneZ;
        trailIndex++;
        trailGeo.setDrawRange(0, trailIndex);
        trailGeo.attributes.position.needsUpdate = true;
      }

      // Beam pulse
      beamMat.opacity = 0.02 + Math.sin(time * 4) * 0.015;

      // ── Bore-dust particles drift down ──
      if (totalDust > 0) {
        const dustPosAttr = dustParticles.geometry.attributes.position;
        const dArr = dustPosAttr.array as Float32Array;
        for (let i = 0; i < totalDust; i++) {
          dArr[i * 3 + 1] -= dustVelocities[i] * dt;
          dArr[i * 3] += Math.sin(time * 0.5 + dustPhases[i]) * 0.005;
          dArr[i * 3 + 2] += Math.cos(time * 0.3 + dustPhases[i]) * 0.005;

          // Reset when reaching ground
          const td = dustTreeData[i];
          if (dArr[i * 3 + 1] < td.y + 1) {
            dArr[i * 3] = td.x + (Math.random() - 0.5) * 3;
            dArr[i * 3 + 1] = td.y + td.height * 0.3 + Math.random() * td.height * 0.5;
            dArr[i * 3 + 2] = td.z + (Math.random() - 0.5) * 3;
          }
        }
        dustPosAttr.needsUpdate = true;
      }

      // ── Pollen particles ──
      const pPosAttr = particles.geometry.attributes.position;
      const pArr = pPosAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pArr[i * 3 + 1] += particleSpeeds[i];
        pArr[i * 3] += Math.sin(time * 0.5 + particlePhases[i]) * 0.015;
        pArr[i * 3 + 2] += Math.cos(time * 0.3 + particlePhases[i]) * 0.015;
        if (pArr[i * 3 + 1] > 45) {
          pArr[i * 3 + 1] = 10 + Math.random() * 5;
          pArr[i * 3] = (Math.random() - 0.5) * terrainSize * 0.8;
          pArr[i * 3 + 2] = (Math.random() - 0.5) * terrainSize * 0.8;
        }
      }
      pPosAttr.needsUpdate = true;

      // ── Stressed tree subtle opacity pulse ──
      const stressedPulse = 0.65 + Math.sin(time * 1.5) * 0.05;
      const infestedPulse = 0.55 + Math.sin(time * 2) * 0.08;
      for (const sm of stressMeshes) {
        const mat = sm.mesh.material as THREE.MeshStandardMaterial;
        if (sm.healthType === 'stressed' && mat.transparent) {
          mat.opacity = stressedPulse;
        } else if (sm.healthType === 'infested' && mat.transparent) {
          mat.opacity = infestedPulse;
        }
      }

      // ── Fog density by time (subtle variation) ──
      (scene.fog as THREE.FogExp2).density = 0.005 + Math.sin(time * 0.1) * 0.0005;

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
    return (
      <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#030d05] via-[#0a2a10] to-[#041208]">
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 40%, rgba(34,197,94,0.1) 0%, transparent 50%)',
              animation: 'pulse 4s ease-in-out infinite',
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[var(--text3)] text-sm font-mono">3D-vy ej tillganglig -- WebGL kravs</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
