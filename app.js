import React, { startTransition, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";
import * as THREE from "https://esm.sh/three@0.168.0";
import { Canvas, useFrame, useThree } from "https://esm.sh/@react-three/fiber@8.17.10?deps=react@18.3.1,react-dom@18.3.1,three@0.168.0";

const html = htm.bind(React.createElement);

const REFERENCE_IMAGE_URL = new URL("./public/reference.png", window.location.href).href;
const DEFAULT_ASPECT_RATIO = "1746 / 744";
const REFERENCE_WIDTH = 1746;
const REFERENCE_HEIGHT = 744;
const MAX_SAMPLE_SIDE = 1400;
const MIN_PARTICLE_STEP = 1.9;
const MAX_PARTICLE_STEP = 3.6;
const MOVING_CLUSTER_GROUPS = 16;
const MOVING_CLUSTER_MEMBERS_MIN = 24;
const MOVING_CLUSTER_MEMBERS_MAX = 64;
const MOTION_CONTROLS = {
  globalMotion: 0.49,
  globalSpeed: 1.78,
  backgroundMotion: 2.13,
  foregroundMotion: 2,
  backgroundSpeed: 1.08,
  foregroundSpeed: 2.2,
  fieldAmount: 1.42,
  driftAmount: 1.06,
  hoverAmount: 0.77,
  swayAmount: 1.81,
  tideAmount: 2,
  globalDotSize: 1.09,
  backgroundDotSize: 1.2,
  foregroundDotSize: 0.83,
  globalAlpha: 1,
  backgroundAlpha: 0.95,
  foregroundAlpha: 1.04,
  clusterSpeed: 0.8,
  clusterPull: 1.6,
  clusterHover: 2.4,
  clusterArc: 1,
  clusterSize: 0.5,
  clusterAlpha: 0.6,
  foregroundCircleAmount: 1,
  sunPointPopulation: 3,
};
const GENERATION_CONTROL_KEYS = ["foregroundCircleAmount", "sunPointPopulation"];
const SUPPRESSED_ORB_MASKS = [
  { x: 248, y: 680, radius: 70 },
  { x: 520, y: 464, radius: 58 },
  { x: 544, y: 704, radius: 72 },
  { x: 656, y: 608, radius: 66 },
  { x: 792, y: 544, radius: 62 },
  { x: 808, y: 688, radius: 68 },
  { x: 976, y: 672, radius: 70 },
  { x: 1048, y: 430, radius: 74 },
  { x: 1056, y: 540, radius: 76 },
  { x: 1128, y: 448, radius: 54 },
  { x: 1144, y: 376, radius: 78 },
  { x: 1160, y: 540, radius: 78 },
  { x: 1180, y: 690, radius: 88 },
  { x: 1200, y: 376, radius: 56 },
  { x: 1232, y: 488, radius: 58 },
  { x: 1512, y: 536, radius: 62 },
];
const SUN_PROTECT_MASK = { x: 890, y: 320, radius: 238 };
const CONTROL_GROUPS = [
  {
    title: "Motion",
    items: [
      { key: "globalMotion", label: "Global motion", min: 0, max: 1.8, step: 0.01 },
      { key: "globalSpeed", label: "Global speed", min: 0.2, max: 2, step: 0.01 },
      { key: "backgroundMotion", label: "Background motion", min: 0, max: 2.4, step: 0.01 },
      { key: "foregroundMotion", label: "Foreground motion", min: 0, max: 2, step: 0.01 },
      { key: "backgroundSpeed", label: "Background speed", min: 0.2, max: 2.2, step: 0.01 },
      { key: "foregroundSpeed", label: "Foreground speed", min: 0.2, max: 2.2, step: 0.01 },
      { key: "fieldAmount", label: "Field swirl", min: 0, max: 2.2, step: 0.01 },
      { key: "driftAmount", label: "Drift", min: 0, max: 2.4, step: 0.01 },
      { key: "hoverAmount", label: "Hover", min: 0, max: 2.4, step: 0.01 },
      { key: "swayAmount", label: "Sway", min: 0, max: 2.4, step: 0.01 },
      { key: "tideAmount", label: "Tide", min: 0, max: 2.2, step: 0.01 },
    ],
  },
  {
    title: "Dots",
    items: [
      { key: "globalDotSize", label: "Global size", min: 0.5, max: 1.8, step: 0.01 },
      { key: "backgroundDotSize", label: "Background size", min: 0.6, max: 2.8, step: 0.01 },
      { key: "foregroundDotSize", label: "Foreground size", min: 0.6, max: 2.2, step: 0.01 },
      { key: "globalAlpha", label: "Global alpha", min: 0.3, max: 1.8, step: 0.01 },
      { key: "backgroundAlpha", label: "Background alpha", min: 0.3, max: 1.8, step: 0.01 },
      { key: "foregroundAlpha", label: "Foreground alpha", min: 0.3, max: 1.8, step: 0.01 },
      { key: "foregroundCircleAmount", label: "Foreground circle amount", min: 0.5, max: 2.5, step: 0.01 },
      { key: "sunPointPopulation", label: "Sun point population", min: 0.5, max: 3, step: 0.01 },
    ],
  },
  {
    title: "Clusters",
    items: [
      { key: "clusterSpeed", label: "Cluster speed", min: 0.2, max: 2.2, step: 0.01 },
      { key: "clusterPull", label: "Cluster pull", min: 0, max: 1.6, step: 0.01 },
      { key: "clusterHover", label: "Cluster hover", min: 0, max: 2.4, step: 0.01 },
      { key: "clusterArc", label: "Cluster arc", min: 0, max: 2.4, step: 0.01 },
      { key: "clusterSize", label: "Cluster size", min: 0.5, max: 2, step: 0.01 },
      { key: "clusterAlpha", label: "Cluster alpha", min: 0.4, max: 2, step: 0.01 },
    ],
  },
];

const DOT_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    float radius = length(centered);
    float mask = 1.0 - smoothstep(0.42, 0.5, radius);
    float grain = 0.95 + (sin((centered.x + centered.y) * 18.0) * 0.05);

    if (mask <= 0.001) {
      discard;
    }

    gl_FragColor = vec4(uColor, vAlpha * mask * grain);
  }
`;

const SIMPLE_VERTEX_SHADER = `
  precision highp float;

  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aAlpha;

  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = max(1.0, aSize * uPixelRatio);
    vAlpha = aAlpha;
  }
`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function formatControlValue(value) {
  return Number(value).toFixed(2);
}

function getEffectiveClusterPull(controls) {
  return clamp(0.74 + (controls.clusterPull * 0.16), 0.74, 1);
}

function pickGenerationControls(controls) {
  return {
    foregroundCircleAmount: controls.foregroundCircleAmount,
    sunPointPopulation: controls.sunPointPopulation,
  };
}

function hash01(a, b, seed = 0) {
  const value = Math.sin((a * 127.1) + (b * 311.7) + (seed * 74.7)) * 43758.5453123;
  return value - Math.floor(value);
}

function getSuppressedOrbMask(x, y, width, height) {
  const scaleX = width / REFERENCE_WIDTH;
  const scaleY = height / REFERENCE_HEIGHT;
  const sunX = SUN_PROTECT_MASK.x * scaleX;
  const sunY = SUN_PROTECT_MASK.y * scaleY;
  const sunRadius = SUN_PROTECT_MASK.radius * ((scaleX + scaleY) * 0.5);
  const sunProtection = smoothstep(sunRadius * 1.05, sunRadius * 0.86, Math.hypot(x - sunX, y - sunY));
  let mask = 0;

  for (const orb of SUPPRESSED_ORB_MASKS) {
    const centerX = orb.x * scaleX;
    const centerY = orb.y * scaleY;
    const radius = orb.radius * ((scaleX + scaleY) * 0.5);
    const distance = Math.hypot(x - centerX, y - centerY);
    mask = Math.max(mask, smoothstep(radius, radius * 0.36, distance));
  }

  return mask * (1 - sunProtection);
}

function readBrightness(pixels, width, x, y) {
  const ix = clamp(Math.round(x), 0, width - 1);
  const iy = clamp(Math.round(y), 0, Math.floor(pixels.length / 4 / width) - 1);
  const offset = (iy * width + ix) * 4;

  const r = pixels[offset] / 255;
  const g = pixels[offset + 1] / 255;
  const b = pixels[offset + 2] / 255;

  return (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
}

function readLocalBrightnessAverage(pixels, width, x, y, spread) {
  const center = readBrightness(pixels, width, x, y) * 0.36;
  const axial = (
    readBrightness(pixels, width, x - spread, y) +
    readBrightness(pixels, width, x + spread, y) +
    readBrightness(pixels, width, x, y - spread) +
    readBrightness(pixels, width, x, y + spread)
  ) * 0.12;
  const diagonal = (
    readBrightness(pixels, width, x - spread, y - spread) +
    readBrightness(pixels, width, x + spread, y - spread) +
    readBrightness(pixels, width, x - spread, y + spread) +
    readBrightness(pixels, width, x + spread, y + spread)
  ) * 0.04;

  return center + axial + diagonal;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.decoding = "async";
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image);
      } else {
        reject(new Error(`Unable to load ${src}`));
      }
    }
  });
}

function createParticleStore() {
  return {
    particles: [],
    positions: [],
    sizes: [],
    alphas: [],
    clusterGroups: [],
  };
}

function pushParticle(store, particle) {
  store.particles.push(particle);

  store.positions.push(particle.baseX, particle.baseY, 0);
  store.sizes.push(particle.size);
  store.alphas.push(particle.alpha);
}

function finalizeParticleStore(store) {
  return {
    count: store.particles.length,
    particles: store.particles,
    positions: new Float32Array(store.positions),
    sizes: new Float32Array(store.sizes),
    alphas: new Float32Array(store.alphas),
    clusterGroups: store.clusterGroups,
  };
}

function detectPrimaryMass(particles) {
  let weightSum = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (const particle of particles) {
    const weight = Math.pow(particle.concentration, 2.1) * (0.4 + particle.alpha);

    if (weight < 0.02) {
      continue;
    }

    weightSum += weight;
    weightedX += particle.baseX * weight;
    weightedY += particle.baseY * weight;
  }

  const centerX = weightSum > 0 ? weightedX / weightSum : 0;
  const centerY = weightSum > 0 ? weightedY / weightSum : 0;

  let spreadWeight = 0;
  let spreadSum = 0;

  for (const particle of particles) {
    const weight = Math.pow(particle.concentration, 1.65) * (0.35 + particle.alpha);

    if (weight < 0.015) {
      continue;
    }

    const dx = particle.baseX - centerX;
    const dy = particle.baseY - centerY;

    spreadWeight += weight;
    spreadSum += ((dx * dx) + (dy * dy)) * weight;
  }

  const spread = spreadWeight > 0 ? Math.sqrt(spreadSum / spreadWeight) : 180;

  return {
    x: centerX,
    y: centerY,
    radius: spread * 1.08,
  };
}

function removeStaticClusterSource(particle, seed, spread = 18) {
  const angle = hash01(particle.baseX, particle.baseY, 1047 + seed) * Math.PI * 2;
  const radius = Math.sqrt(hash01(particle.baseX, particle.baseY, 1059 + seed)) * spread;

  particle.sourceClusterBlend = true;
  particle.sourceClusterBackground = true;
  particle.sourceClusterConcentration = 0.08 + (hash01(particle.baseX, particle.baseY, 1033 + seed) * 0.12);
  particle.sourceClusterAlpha = 0.045 + (hash01(particle.baseX, particle.baseY, 1039 + seed) * 0.055);
  particle.sourceClusterSize = 0.22 + (hash01(particle.baseX, particle.baseY, 1051 + seed) * 0.12);
  particle.sourceDissolveX = Math.cos(angle) * radius;
  particle.sourceDissolveY = Math.sin(angle) * radius;
  particle.sourceScatterRadius = 2.4 + (hash01(particle.baseX, particle.baseY, 1063 + seed) * 4.8);
  particle.sourceScatterPhase = hash01(particle.baseX, particle.baseY, 1087 + seed) * Math.PI * 2;
}

function isProtectedReferenceMass(particle, focus) {
  return particle.baseX > focus.x + (focus.radius * 1.45)
    && particle.baseY < focus.y - (focus.radius * 0.45);
}

function addClusterDustFillers(store, anchor, radius, count, seed) {
  for (let index = 0; index < count; index += 1) {
    const angle = hash01(anchor.x, anchor.y, 2200 + seed + index) * Math.PI * 2;
    const distance = Math.sqrt(hash01(anchor.x, anchor.y, 2300 + seed + index)) * radius;
    const baseX = anchor.x + (Math.cos(angle) * distance);
    const baseY = anchor.y + (Math.sin(angle) * distance);
    const concentration = 0.05 + (hash01(baseX, baseY, 2400 + seed) * 0.08);

    pushParticle(store, {
      baseX,
      baseY,
      size: 0.52 + (hash01(baseX, baseY, 2600 + seed) * 0.42),
      alpha: 0.12 + (hash01(baseX, baseY, 2500 + seed) * 0.2),
      amplitude: 0.5 + (hash01(baseX, baseY, 2700 + seed) * 0.35),
      hoverRadius: 3.8 + (hash01(baseX, baseY, 2800 + seed) * 2.8),
      hoverSpeed: 0.18 + (hash01(baseX, baseY, 2900 + seed) * 0.16),
      concentration,
      generatedFill: true,
      phase: hash01(baseX, baseY, 3000 + seed) * Math.PI * 2,
      speed: 0.18 + (hash01(baseX, baseY, 3100 + seed) * 0.08),
    });
  }
}

function dissolveResidualSmallMasses(store, focus) {
  for (let particleIndex = 0; particleIndex < store.particles.length; particleIndex += 1) {
    const particle = store.particles[particleIndex];

    if (particle.dynamicCluster || particle.generatedFill || particle.sourceClusterBlend) {
      continue;
    }

    const distance = Math.hypot(particle.baseX - focus.x, particle.baseY - focus.y);

    if (distance < focus.radius * 0.72 || isProtectedReferenceMass(particle, focus)) {
      continue;
    }

    const foregroundSignal = (particle.concentration * 1.25) + (particle.alpha * 0.95) + (particle.size * 0.12);

    if (particle.concentration < 0.08 && particle.alpha < 0.13 && particle.size < 1.15) {
      continue;
    }

    if (foregroundSignal < 0.38) {
      continue;
    }

    removeStaticClusterSource(particle, 4200 + particleIndex, focus.radius * 0.42);
  }
}

function addMotionClusterCopies(store) {
  const particles = store.particles;
  const focus = detectPrimaryMass(particles);
  const cellSize = clamp(focus.radius * 0.075, 10, 18);
  const cells = new Map();

  function getCellKey(cellX, cellY) {
    return `${cellX}:${cellY}`;
  }

  function getCell(cellX, cellY) {
    return cells.get(getCellKey(cellX, cellY));
  }

  function summarizeNeighborhood(cellX, cellY, radius) {
    let weight = 0;
    let pointCount = 0;
    let sumX = 0;
    let sumY = 0;

    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const cell = getCell(cellX + offsetX, cellY + offsetY);

        if (!cell) {
          continue;
        }

        weight += cell.weight;
        pointCount += cell.pointCount;
        sumX += cell.sumX;
        sumY += cell.sumY;
      }
    }

    return {
      weight,
      pointCount,
      centerX: pointCount > 0 ? sumX / pointCount : cellX * cellSize,
      centerY: pointCount > 0 ? sumY / pointCount : cellY * cellSize,
    };
  }

  for (const particle of particles) {
    const distance = Math.hypot(particle.baseX - focus.x, particle.baseY - focus.y);
    const signal = (particle.concentration * 1.5) + (particle.alpha * 1.25) + (particle.size * 0.06);

    if (distance < focus.radius * 0.9 || distance > focus.radius * 3.2 || signal < 0.52) {
      continue;
    }

    const cellX = Math.round(particle.baseX / cellSize);
    const cellY = Math.round(particle.baseY / cellSize);
    const key = getCellKey(cellX, cellY);
    const existing = cells.get(key);

    if (existing) {
      existing.weight += signal;
      existing.pointCount += 1;
      existing.sumX += particle.baseX;
      existing.sumY += particle.baseY;
      continue;
    }

    cells.set(key, {
      cellX,
      cellY,
      weight: signal,
      pointCount: 1,
      sumX: particle.baseX,
      sumY: particle.baseY,
    });
  }

  const metrics = [];
  let maxLocalWeight = 0;

  for (const cell of cells.values()) {
    const local = summarizeNeighborhood(cell.cellX, cell.cellY, 1);
    const wide = summarizeNeighborhood(cell.cellX, cell.cellY, 2);
    const distance = Math.hypot(local.centerX - focus.x, local.centerY - focus.y);
    const surroundingWeight = Math.max(0.001, wide.weight - local.weight);
    const prominence = local.weight / surroundingWeight;
    const ringBias = clamp(
      1 - (Math.abs(distance - (focus.radius * 1.45)) / (focus.radius * 1.65)),
      0.2,
      1
    );
    const score = local.weight * (0.55 + prominence) * ringBias;

    metrics.push({
      x: local.centerX,
      y: local.centerY,
      localWeight: local.weight,
      localPointCount: local.pointCount,
      prominence,
      score,
    });

    maxLocalWeight = Math.max(maxLocalWeight, local.weight);
  }

  const anchors = [];
  const anchorSpacing = clamp(focus.radius * 0.32, 48, 108);
  const candidates = metrics
    .filter((candidate) => {
      return candidate.localWeight >= maxLocalWeight * 0.2
        && candidate.localPointCount >= 10
        && candidate.prominence >= 0.62
        && candidate.score > 8;
    })
    .sort((left, right) => right.score - left.score);

  for (const candidate of candidates) {
    const tooClose = anchors.some((anchor) => {
      return Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y) < anchorSpacing;
    });

    if (tooClose) {
      continue;
    }

    anchors.push(candidate);

    if (anchors.length >= MOVING_CLUSTER_GROUPS) {
      break;
    }
  }

  const claimed = new Set();

  anchors.forEach((anchor, groupIndex) => {
    const clusterRadius = clamp((cellSize * 1.9) + ((anchor.localWeight / Math.max(1, maxLocalWeight)) * cellSize * 1.7), 14, 28);
    const nearby = [];

    for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
      const particle = particles[particleIndex];

      if (particle.dynamicCluster || particle.generatedFill) {
        continue;
      }

      const signal = (particle.concentration * 1.35) + (particle.alpha * 1.1);
      const distance = Math.hypot(particle.baseX - anchor.x, particle.baseY - anchor.y);

      if (claimed.has(particleIndex) || distance > clusterRadius || signal < 0.28) {
        continue;
      }

      nearby.push({
        particle,
        particleIndex,
        distance,
        signal,
      });
    }

    if (nearby.length < MOVING_CLUSTER_MEMBERS_MIN) {
      return;
    }

    nearby.sort((left, right) => left.distance - right.distance);

    const memberCount = clamp(
      Math.round(nearby.length * 0.72),
      MOVING_CLUSTER_MEMBERS_MIN,
      Math.min(MOVING_CLUSTER_MEMBERS_MAX, nearby.length)
    );
    for (let memberIndex = 0; memberIndex < memberCount; memberIndex += 1) {
      const member = nearby[memberIndex];

      if (!member) {
        continue;
      }

      const { particle, particleIndex, distance } = member;

      claimed.add(particleIndex);
      removeStaticClusterSource(particle, groupIndex, clusterRadius * 4.2);
    }
  });

  dissolveResidualSmallMasses(store, focus);

  return focus;
}

function addSunPopulationCopies(store, focus, generationControls) {
  const sunPointPopulation = generationControls.sunPointPopulation ?? 1;

  if (sunPointPopulation <= 1.001) {
    return;
  }

  const baseParticles = [...store.particles];
  const extraChanceScale = sunPointPopulation - 1;
  const innerRadius = focus.radius * 1.08;
  const compactness = smoothstep(1, 3, sunPointPopulation);

  for (let particleIndex = 0; particleIndex < baseParticles.length; particleIndex += 1) {
    const particle = baseParticles[particleIndex];

    if (particle.dynamicCluster) {
      continue;
    }

    const distanceToFocus = Math.hypot(particle.baseX - focus.x, particle.baseY - focus.y);

    if (distanceToFocus > innerRadius) {
      continue;
    }

    const sunMask = smoothstep(innerRadius, focus.radius * 0.18, distanceToFocus);
    const densityMask = smoothstep(0.42, 0.92, particle.concentration);
    const spawnChance = clamp(extraChanceScale * sunMask * densityMask * 0.72, 0, 0.94);

    if (spawnChance <= 0.001 || hash01(particle.baseX, particle.baseY, 881) > spawnChance) {
      continue;
    }

    const toFocusX = focus.x - particle.baseX;
    const toFocusY = focus.y - particle.baseY;
    const toFocusLength = Math.max(0.0001, Math.hypot(toFocusX, toFocusY));
    const dirToFocusX = toFocusX / toFocusLength;
    const dirToFocusY = toFocusY / toFocusLength;
    const tangentX = -dirToFocusY;
    const tangentY = dirToFocusX;
    const inwardBias = (0.12 + (compactness * 0.52)) * (0.55 + (sunMask * 0.45));
    const tangentSpread = (1 - compactness) * (0.28 + (hash01(particle.baseX, particle.baseY, 887) * 0.4));
    const companionRadius = (0.06 + (hash01(particle.baseX, particle.baseY, 911) * 0.18)) * (0.9 - (compactness * 0.28));
    const offsetX = (dirToFocusX * inwardBias) + (tangentX * tangentSpread);
    const offsetY = (dirToFocusY * inwardBias) + (tangentY * tangentSpread);

    pushParticle(store, {
      baseX: particle.baseX + offsetX + (dirToFocusX * companionRadius),
      baseY: particle.baseY + offsetY + (dirToFocusY * companionRadius),
      size: particle.size * (0.76 + (hash01(particle.baseX, particle.baseY, 929) * 0.12)),
      alpha: particle.alpha * (0.78 + (sunMask * 0.16)),
      amplitude: particle.amplitude * 0.9,
      hoverRadius: particle.hoverRadius * 0.92,
      hoverSpeed: particle.hoverSpeed * 1.03,
      concentration: clamp(particle.concentration * 1.02, 0, 1),
      phase: hash01(particle.baseX, particle.baseY, 947) * Math.PI * 2,
      speed: particle.speed * 1.02,
    });

    const secondChance = clamp((spawnChance - 0.26) * 0.9, 0, 0.64);

    if (secondChance > 0.001 && hash01(particle.baseX, particle.baseY, 971) < secondChance) {
      const secondTangent = ((hash01(particle.baseX, particle.baseY, 983) - 0.5) * 2) * tangentSpread * 0.9;
      const secondRadius = companionRadius * (0.45 + (hash01(particle.baseX, particle.baseY, 991) * 0.22));

      pushParticle(store, {
        baseX: particle.baseX + (dirToFocusX * (inwardBias + secondRadius)) + (tangentX * secondTangent),
        baseY: particle.baseY + (dirToFocusY * (inwardBias + secondRadius)) + (tangentY * secondTangent),
        size: particle.size * (0.66 + (hash01(particle.baseX, particle.baseY, 1009) * 0.1)),
        alpha: particle.alpha * (0.72 + (sunMask * 0.14)),
        amplitude: particle.amplitude * 0.88,
        hoverRadius: particle.hoverRadius * 0.9,
        hoverSpeed: particle.hoverSpeed * 1.04,
        concentration: clamp(particle.concentration, 0, 1),
        phase: hash01(particle.baseX, particle.baseY, 1021) * Math.PI * 2,
        speed: particle.speed * 1.04,
      });
    }
  }
}

function buildUnifiedParticles(pixels, width, height, generationControls) {
  const store = createParticleStore();
  const foregroundCircleAmount = generationControls.foregroundCircleAmount ?? 1;

  const step = clamp(Math.min(width, height) / 245, MIN_PARTICLE_STEP, MAX_PARTICLE_STEP);
  const localSpread = step * 1.15;

  for (let y = step * 0.5; y < height; y += step) {
    for (let x = step * 0.5; x < width; x += step) {
      // Keep the source image legible by only nudging the sample positions slightly.
      const jitterX = (hash01(x, y, 19) - 0.5) * step * 0.18;
      const jitterY = (hash01(x, y, 41) - 0.5) * step * 0.18;
      const sampleX = clamp(Math.round(x + jitterX), 0, width - 1);
      const sampleY = clamp(Math.round(y + jitterY), 0, height - 1);
      const sourceBrightness = readBrightness(pixels, width, sampleX, sampleY);
      const sourceConcentration = Math.pow(readLocalBrightnessAverage(pixels, width, sampleX, sampleY, localSpread), 1.7);
      const orbMask = getSuppressedOrbMask(sampleX, sampleY, width, height);
      const brightness = orbMask > 0
        ? lerp(sourceBrightness, 0.26 + (hash01(sampleX, sampleY, 4321) * 0.08), orbMask)
        : sourceBrightness;
      const concentration = orbMask > 0
        ? lerp(sourceConcentration, 0.055 + (hash01(sampleX, sampleY, 4339) * 0.05), orbMask)
        : sourceConcentration;
      const foregroundMask = smoothstep(0.32, 0.92, concentration);
      const foregroundChanceScale = lerp(1, foregroundCircleAmount, foregroundMask);
      const density = Math.pow(brightness, 2.05);
      const presence = clamp((density * 0.58) + (concentration * 0.94), 0, 1.25);

      if (presence < 0.04) {
        continue;
      }

      const worldX = sampleX - width / 2;
      const worldY = height / 2 - sampleY;
      const drawChance = clamp(((density * 0.72) + (concentration * 0.88)) * foregroundChanceScale, 0, 0.995);

      if (hash01(sampleX, sampleY, 71) > drawChance) {
        continue;
      }

      const amplitude = 0.26 + ((1 - concentration) * 0.58);
      const hoverRadius = 1.8 + ((1 - concentration) * 4.4) + (hash01(sampleX, sampleY, 131) * 0.7);
      const size = 0.62 + (density * 1.2) + (concentration * 2.35) + (hash01(sampleX, sampleY, 97) * 0.08);
      const alpha = 0.035 + (density * 0.16) + (concentration * 0.84);
      const speed = 0.14 + ((1 - concentration) * 0.2) + (hash01(sampleX, sampleY, 149) * 0.028);
      const hoverSpeed = 0.18 + (hash01(sampleX, sampleY, 157) * 0.16);

      pushParticle(store, {
        baseX: worldX,
        baseY: worldY,
        size,
        alpha,
        amplitude,
        hoverRadius,
        hoverSpeed,
        concentration,
        phase: hash01(sampleX, sampleY, 113) * Math.PI * 2,
        speed,
      });

      function pushCompanion(seedOffset, radiusScale, alphaScaleValue, companionSizeScale) {
        const companionAngle = hash01(sampleX, sampleY, 181 + seedOffset) * Math.PI * 2;
        const companionRadius = (0.18 + (hash01(sampleX, sampleY, 197 + seedOffset) * 0.52)) * step * radiusScale;

        pushParticle(store, {
          baseX: worldX + (Math.cos(companionAngle) * companionRadius),
          baseY: worldY + (Math.sin(companionAngle) * companionRadius),
          size: size * (companionSizeScale + (hash01(sampleX, sampleY, 211 + seedOffset) * 0.12)),
          alpha: alpha * alphaScaleValue,
          amplitude: amplitude * 0.94,
          hoverRadius: hoverRadius * 0.96,
          hoverSpeed: hoverSpeed * 1.02,
          concentration: concentration * 0.94,
          phase: hash01(sampleX, sampleY, 223 + seedOffset) * Math.PI * 2,
          speed: speed * 1.04,
        });
      }

      const companionChance = clamp(((concentration - 0.68) * 1.35) * foregroundChanceScale, 0, 0.74);

      if (hash01(sampleX, sampleY, 173) < companionChance) {
        pushCompanion(0, 1, 0.82, 0.72);
      }

      const extraForegroundChance = clamp((foregroundCircleAmount - 1) * 0.46 * foregroundMask, 0, 0.78);

      if (extraForegroundChance > 0 && hash01(sampleX, sampleY, 257) < extraForegroundChance) {
        pushCompanion(53, 0.84, 0.78, 0.68);
      }
    }
  }

  const focus = detectPrimaryMass(store.particles);
  addSunPopulationCopies(store, focus, generationControls);

  const finalized = finalizeParticleStore(store);
  finalized.focus = focus;
  return finalized;
}

function buildSceneData(image, generationControls) {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, MAX_SAMPLE_SIDE / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Unable to create the offscreen sampling canvas.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  const stipple = buildUnifiedParticles(pixels, width, height, generationControls);

  return {
    width,
    height,
    aspectRatio: `${width} / ${height}`,
    stipple,
  };
}

function createDotMaterial(vertexShader, color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPixelRatio: { value: window.devicePixelRatio || 1 },
    },
    vertexShader,
    fragmentShader: DOT_FRAGMENT_SHADER,
  });
}

function CameraBounds({ width, height }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.near = -100;
    camera.far = 100;
    camera.position.set(0, 0, 10);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}

function UnifiedPointCloud({ data, controls }) {
  const pointsRef = useRef(null);
  const material = useMemo(() => createDotMaterial(SIMPLE_VERTEX_SHADER, "#f3ede2"), []);
  const { gl } = useThree();

  useEffect(() => {
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();

    return () => {
      material.dispose();
    };
  }, [gl, material]);

  useFrame((state) => {
    if (!pointsRef.current) {
      return;
    }

    const elapsed = state.clock.elapsedTime;
    const geometry = pointsRef.current.geometry;
    const positions = geometry.attributes.position.array;
    const sizes = geometry.attributes.aSize.array;
    const alphas = geometry.attributes.aAlpha.array;
    const sunReactions = [];

    for (const clusterGroup of data.clusterGroups ?? []) {
      const rawCycle = ((elapsed * controls.clusterSpeed) / clusterGroup.duration) + clusterGroup.travelOffset;
      const loop = rawCycle - Math.floor(rawCycle);
      let travelT = 0;
      let mergeT = smoothstep(clusterGroup.moveEnd - 0.22, 0.995, loop);

      if (loop < clusterGroup.moveEnd) {
        const phaseT = loop / Math.max(0.001, clusterGroup.moveEnd);
        travelT = smoothstep(0, 1, phaseT);
        travelT = smoothstep(0, 1, travelT);
      } else {
        travelT = 1;
      }

      const effectiveClusterPull = getEffectiveClusterPull(controls);
      const pulledTargetX = lerp(clusterGroup.originX, clusterGroup.targetX, effectiveClusterPull);
      const pulledTargetY = lerp(clusterGroup.originY, clusterGroup.targetY, effectiveClusterPull);
      const pathCenterX = lerp(clusterGroup.originX, pulledTargetX, travelT);
      const pathCenterY = lerp(clusterGroup.originY, pulledTargetY, travelT);
      const centerX = lerp(pathCenterX, clusterGroup.sinkX, mergeT);
      const centerY = lerp(pathCenterY, clusterGroup.sinkY, mergeT);
      const pathArc = Math.sin(travelT * Math.PI) * clusterGroup.arcAmount * controls.clusterArc;
      const softFlow = Math.sin((travelT * Math.PI * 2) + clusterGroup.clusterPhase) * clusterGroup.arcAmount * 0.12;
      const meander = Math.sin((elapsed * 0.22 * controls.clusterSpeed) + clusterGroup.clusterPhase) * clusterGroup.arcAmount * 0.08;
      const reactionAmount = smoothstep(clusterGroup.moveEnd - 0.36, clusterGroup.moveEnd + 0.012, loop)
        * (1 - smoothstep(0.984, 0.999, loop));

      sunReactions.push({
        x: centerX + (clusterGroup.pathNormalX * (pathArc + softFlow + meander)),
        y: centerY + (clusterGroup.pathNormalY * (pathArc + softFlow + meander)),
        strength: reactionAmount * clusterGroup.mergeStrength * 1.45,
        radius: clusterGroup.mergeRadius * 1.25,
      });
    }

    for (let index = 0; index < data.particles.length; index += 1) {
      const particle = data.particles[index];
      const visualConcentration = particle.sourceClusterBackground && !particle.dynamicCluster
        ? particle.sourceClusterConcentration
        : particle.concentration;
      const backgroundMix = clamp(1 - visualConcentration, 0, 1);
      const motionScale = controls.globalMotion * lerp(controls.foregroundMotion, controls.backgroundMotion, backgroundMix);
      const speedScale = controls.globalSpeed * lerp(controls.foregroundSpeed, controls.backgroundSpeed, backgroundMix);
      const sizeScale = controls.globalDotSize * lerp(controls.foregroundDotSize, controls.backgroundDotSize, backgroundMix);
      const alphaScale = controls.globalAlpha * lerp(controls.foregroundAlpha, controls.backgroundAlpha, backgroundMix);
      const fieldX = Math.sin((particle.baseY * 0.009) + (elapsed * 0.2 * speedScale) + particle.phase) * particle.amplitude * 1.12 * controls.fieldAmount * motionScale;
      const fieldY = Math.cos((particle.baseX * 0.008) - (elapsed * 0.18 * speedScale) + (particle.phase * 0.7)) * particle.amplitude * 1.12 * controls.fieldAmount * motionScale;
      const driftX = Math.sin((elapsed * particle.speed * speedScale) + particle.phase) * particle.amplitude * 1.55 * controls.driftAmount * motionScale;
      const driftY = Math.cos((elapsed * (particle.speed * 0.9) * speedScale) + (particle.phase * 1.31)) * particle.amplitude * 1.55 * controls.driftAmount * motionScale;
      const ambientHover = (particle.hoverRadius ?? (1.6 + ((1 - visualConcentration) * 3.8))) * controls.hoverAmount * motionScale;
      const hoverSpeed = (particle.hoverSpeed ?? 0.22) * speedScale;
      const hoverX = Math.sin((elapsed * hoverSpeed) + (particle.phase * 0.8)) * ambientHover;
      const hoverY = Math.cos((elapsed * (hoverSpeed * 0.94)) + (particle.phase * 1.1)) * ambientHover;
      const swayRadius = ambientHover * 0.46 * controls.swayAmount;
      const swayX = Math.cos((elapsed * ((hoverSpeed * 0.7) + 0.08)) + (particle.phase * 1.9)) * swayRadius;
      const swayY = Math.sin((elapsed * ((hoverSpeed * 0.62) + 0.06)) + (particle.phase * 1.4)) * swayRadius;
      const tideRadius = ambientHover * 0.26 * controls.tideAmount;
      const tideX = Math.sin((particle.baseY * 0.0028) + (elapsed * 0.12 * speedScale) + (particle.phase * 0.35)) * tideRadius;
      const tideY = Math.cos((particle.baseX * 0.0025) - (elapsed * 0.11 * speedScale) + (particle.phase * 0.42)) * tideRadius;
      let x = particle.baseX + driftX + fieldX + hoverX + swayX + tideX;
      let y = particle.baseY + driftY + fieldY + hoverY + swayY + tideY;
      let size = particle.size * sizeScale;
      let alpha = particle.alpha * alphaScale;

      if (particle.dynamicCluster) {
        const rawCycle = ((elapsed * controls.clusterSpeed) / particle.clusterDuration) + particle.clusterTravelOffset;
        const loop = rawCycle - Math.floor(rawCycle);
        const moveEnd = particle.clusterMoveEnd ?? 0.78;
        let travelT = 0;
        let mergeT = smoothstep(moveEnd - 0.22, 0.995, loop);

        if (loop < moveEnd) {
          const phaseT = loop / Math.max(0.001, moveEnd);
          travelT = smoothstep(0, 1, phaseT);
          travelT = smoothstep(0, 1, travelT);
        } else {
          travelT = 1;
        }

        const effectiveClusterPull = getEffectiveClusterPull(controls);
        const pulledTargetX = lerp(particle.clusterOriginX, particle.clusterTargetX, effectiveClusterPull);
        const pulledTargetY = lerp(particle.clusterOriginY, particle.clusterTargetY, effectiveClusterPull);
        const pathCenterX = lerp(particle.clusterOriginX, pulledTargetX, travelT);
        const pathCenterY = lerp(particle.clusterOriginY, pulledTargetY, travelT);
        const centerX = lerp(pathCenterX, particle.clusterSinkX, mergeT);
        const centerY = lerp(pathCenterY, particle.clusterSinkY, mergeT);
        const pathArc = Math.sin(travelT * Math.PI) * particle.clusterArcAmount * controls.clusterArc;
        const hoverX = Math.sin((elapsed * 0.46 * controls.clusterSpeed) + particle.clusterPhase) * particle.clusterHoverX * controls.clusterHover;
        const hoverY = Math.cos((elapsed * 0.39 * controls.clusterSpeed) + (particle.clusterPhase * 1.13)) * particle.clusterHoverY * controls.clusterHover;
        const meanderSpeed = particle.clusterMeanderSpeed ?? 0.28;
        const meanderX = Math.sin((elapsed * meanderSpeed * controls.clusterSpeed) + (particle.clusterPhase * 0.61)) * (particle.clusterMeanderX ?? 1.2);
        const meanderY = Math.cos((elapsed * (meanderSpeed * 0.92) * controls.clusterSpeed) + (particle.clusterPhase * 0.83)) * (particle.clusterMeanderY ?? 1.2);
        const flowX = Math.sin((travelT * Math.PI * 2) + particle.clusterPhase) * (particle.clusterPathNormalX * particle.clusterArcAmount * 0.16);
        const flowY = Math.cos((travelT * Math.PI * 2) + particle.clusterPhase) * (particle.clusterPathNormalY * particle.clusterArcAmount * 0.16);
        const settleBlend = smoothstep(0.62, 1, travelT);
        const rotation = Math.sin((elapsed * 0.18) + particle.clusterPhase) * particle.clusterRotate;
        const offsetCos = Math.cos(rotation);
        const offsetSin = Math.sin(rotation);
        const offsetX = (particle.clusterOffsetX * offsetCos) - (particle.clusterOffsetY * offsetSin);
        const offsetY = (particle.clusterOffsetX * offsetSin) + (particle.clusterOffsetY * offsetCos);
        x = centerX
          + offsetX
          + hoverX
          + (meanderX * (1 - (settleBlend * 0.58)))
          + (flowX * (1 - (settleBlend * 0.42)))
          + driftX
          + (particle.clusterPathNormalX * pathArc * (1 - (settleBlend * 0.3)));
        y = centerY
          + offsetY
          + hoverY
          + (meanderY * (1 - (settleBlend * 0.58)))
          + (flowY * (1 - (settleBlend * 0.42)))
          + driftY
          + (particle.clusterPathNormalY * pathArc * (1 - (settleBlend * 0.3)));

        const suctionT = smoothstep(particle.clusterSuctionStart ?? 0.2, 1, travelT + (mergeT * 0.6));
        const suctionDX = particle.clusterSinkX - x;
        const suctionDY = particle.clusterSinkY - y;
        const suctionDistance = Math.max(0.0001, Math.hypot(suctionDX, suctionDY));
        const proximity = 1 - clamp(suctionDistance / Math.max(1, data.focus.radius * 0.68), 0, 1);
        const suctionBias = particle.clusterSuctionBias ?? 0.8;
        const suctionPull = clamp(
          ((suctionT * 0.16) + (proximity * 0.32) + (mergeT * 0.42)) * suctionBias,
          0,
          0.82
        );
        x += (suctionDX / suctionDistance) * suctionDistance * suctionPull;
        y += (suctionDY / suctionDistance) * suctionDistance * suctionPull;

        const fadeIn = smoothstep(0.08, 0.18, loop);
        const fadeOut = 1 - smoothstep(moveEnd + 0.012, 0.995, loop);
        const absorbedFade = 1 - (mergeT * 0.18);
        alpha *= fadeIn * fadeOut * absorbedFade * particle.clusterAlphaBoost * controls.clusterAlpha;
        size *= particle.clusterSizeBoost * controls.clusterSize * (1 - (mergeT * 0.42));
      } else {
        if (particle.sourceClusterBlend) {
          const scatterX = (particle.sourceDissolveX ?? 0)
            + (Math.cos((elapsed * 0.18) + particle.sourceScatterPhase) * particle.sourceScatterRadius);
          const scatterY = (particle.sourceDissolveY ?? 0)
            + (Math.sin((elapsed * 0.15) + particle.sourceScatterPhase) * particle.sourceScatterRadius);
          x += scatterX;
          y += scatterY;
          alpha *= particle.sourceClusterAlpha;
          size *= particle.sourceClusterSize;
        }

        const focusDistance = Math.hypot(particle.baseX - data.focus.x, particle.baseY - data.focus.y);
        const sunMask = smoothstep(data.focus.radius * 1.22, data.focus.radius * 0.74, focusDistance) * smoothstep(0.36, 0.82, visualConcentration);

        if (sunMask > 0.001) {
          for (const reaction of sunReactions) {
            if (reaction.strength <= 0.001) {
              continue;
            }

            const dx = reaction.x - particle.baseX;
            const dy = reaction.y - particle.baseY;
            const distance = Math.hypot(dx, dy);

            if (distance > reaction.radius) {
              continue;
            }

            const local = 1 - (distance / reaction.radius);
            const soften = local * local * reaction.strength * sunMask;
            const normX = distance > 0.0001 ? dx / distance : 0;
            const normY = distance > 0.0001 ? dy / distance : 0;
            const mergePull = soften * reaction.radius * 0.075;
            const ripple = Math.sin(local * Math.PI) * soften * reaction.radius * 0.034;

            x += (normX * mergePull) - (normY * ripple);
            y += (normY * mergePull) + (normX * ripple);
            size *= 1 + (soften * 0.28);
            alpha *= 1 + (soften * 0.32);
          }
        }
      }

      positions[index * 3] = x;
      positions[(index * 3) + 1] = y;
      positions[(index * 3) + 2] = 0;
      sizes[index] = size;
      alphas[index] = alpha;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  });

  return html`
    <points ref=${pointsRef} frustumCulled=${false} renderOrder=${1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args=${[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args=${[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args=${[data.alphas, 1]} />
      </bufferGeometry>
      <primitive object=${material} attach="material" />
    </points>
  `;
}

function SettingsPanel({ controls, onChange, onReset }) {
  const preset = useMemo(() => JSON.stringify(controls, null, 2), [controls]);

  return html`
    <aside className="controls-panel">
      <div className="controls-header">
        <div>
          <p className="controls-kicker">Live Tuning</p>
          <h2>Dial this in</h2>
        </div>
        <button className="ghost-button" type="button" onClick=${onReset}>Reset</button>
      </div>

      <p className="controls-copy">
        Ajusta tudo aqui no browser e depois manda-me o preset em baixo com os valores certos.
      </p>

      <div className="controls-groups">
        ${CONTROL_GROUPS.map((group) => html`
          <section className="control-group" key=${group.title}>
            <h3>${group.title}</h3>
            <div className="control-list">
              ${group.items.map((item) => html`
                <label className="control-row" key=${item.key}>
                  <span className="control-meta">
                    <span>${item.label}</span>
                    <strong>${formatControlValue(controls[item.key])}</strong>
                  </span>
                  <input
                    type="range"
                    min=${item.min}
                    max=${item.max}
                    step=${item.step}
                    value=${controls[item.key]}
                    onInput=${(event) => onChange(item.key, Number(event.currentTarget.value))}
                  />
                </label>
              `)}
            </div>
          </section>
        `)}
      </div>

      <section className="preset-box">
        <div className="preset-head">
          <h3>Preset</h3>
          <span>Copy these values to send back</span>
        </div>
        <pre>${preset}</pre>
      </section>
    </aside>
  `;
}

function PointillismCanvas({ sceneData, controls }) {
  return html`
    <${Canvas}
      orthographic=${true}
      dpr=${[1, 2]}
      frameloop="always"
      className="pointillism-canvas"
      gl=${{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera=${{ position: [0, 0, 10], zoom: 1 }}
      onCreated=${({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <${CameraBounds} width=${sceneData.width} height=${sceneData.height} />
      <${UnifiedPointCloud} data=${sceneData.stipple} controls=${controls} />
    </${Canvas}>
  `;
}

function App() {
  const [sourceImage, setSourceImage] = useState(null);
  const [sceneData, setSceneData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [controls, setControls] = useState(() => ({ ...MOTION_CONTROLS }));
  const generationControls = useMemo(() => pickGenerationControls(controls), [
    controls.foregroundCircleAmount,
    controls.sunPointPopulation,
  ]);
  const generationSignature = useMemo(() => {
    return JSON.stringify(GENERATION_CONTROL_KEYS.map((key) => [key, generationControls[key]]));
  }, [generationControls]);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setErrorMessage("");

    loadImage(REFERENCE_IMAGE_URL)
      .then((image) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSourceImage(image);
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Point cloud setup failed:", error);
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Unknown setup error.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sourceImage) {
      return;
    }

    const nextSceneData = buildSceneData(sourceImage, generationControls);

    startTransition(() => {
      setSceneData(nextSceneData);
      setStatus("ready");
      setErrorMessage("");
    });
  }, [sourceImage, generationSignature]);

  function updateControl(key, value) {
    setControls((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetControls() {
    setControls({ ...MOTION_CONTROLS });
  }

  return html`
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Three.js point study</p>
          <h1>A tua imagem agora e o proprio point cloud.</h1>
        </div>
          <p className="copy">
            Nada de imagem HTML por baixo. O que aparece no palco sao os pontos do Three.js
          gerados a partir da reference.png, com hover subtil no campo e sem clusters artificiais.
          </p>
      </header>

      <section className="workspace">
        <div className="stage-shell">
          <div className="stage" style=${{ aspectRatio: sceneData ? sceneData.aspectRatio : DEFAULT_ASPECT_RATIO }}>
            ${sceneData ? html`<${PointillismCanvas} sceneData=${sceneData} controls=${controls} />` : null}
            ${status === "error"
              ? html`
                  <div className="status-card">
                    <strong>Point cloud setup failed.</strong>
                    <span>
                      ${errorMessage || "An unknown error happened while loading or processing the reference image."}
                    </span>
                  </div>
                `
              : null}
          </div>
        </div>

        <${SettingsPanel} controls=${controls} onChange=${updateControl} onReset=${resetControls} />
      </section>
    </main>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
