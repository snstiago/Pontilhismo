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
const MOTION_CONTROLS = {
  globalMotion: 0,
  globalSpeed: 0.2,
  inwardFlow: 0.04,
  flowSpeed: 1,
  flowDistance: 0.35,
  respawnSpread: 0.8,
  mergeReach: 0.91,
  flowArc: 1.46,
  waveFlow: 0,
  localMotion: 1.12,
  localSpeed: 1.35,
  backgroundMotion: 1.36,
  foregroundMotion: 1.14,
  backgroundSpeed: 0.92,
  foregroundSpeed: 1.12,
  fieldAmount: 0.3,
  driftAmount: 0.2,
  hoverAmount: 0.16,
  swayAmount: 0.22,
  tideAmount: 0.81,
  globalDotSize: 1.8,
  backgroundDotSize: 1.08,
  foregroundDotSize: 0.6,
  orbDotSize: 1.8,
  orbSolidFill: 1,
  dotProtection: 1.8,
  hoverSpacing: 1.2,
  denseExitShrink: 1,
  motionCohesion: 1.12,
  foregroundCircleAmount: 2.5,
  sunPointPopulation: 3,
  backgroundColor: "#050505",
  dotColor: "#d9fce8",
};
const GENERATION_CONTROL_KEYS = ["foregroundCircleAmount", "sunPointPopulation", "dotProtection"];
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
const SUN_PROTECT_MASK = { x: 890, y: 300, radius: 207 };
const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
];
const CONTROL_GROUPS = [
  {
    title: "Flow",
    items: [
      { key: "globalMotion", label: "Overall motion", min: 0, max: 1.8, step: 0.01 },
      { key: "globalSpeed", label: "Overall speed", min: 0.2, max: 2, step: 0.01 },
      { key: "inwardFlow", label: "Inward pull", min: 0, max: 2.4, step: 0.01 },
      { key: "flowSpeed", label: "Inward speed", min: 0.2, max: 2.4, step: 0.01 },
      { key: "flowDistance", label: "Travel distance", min: 0.35, max: 2.2, step: 0.01 },
      { key: "respawnSpread", label: "Respawn spread", min: 0.35, max: 2, step: 0.01 },
      { key: "mergeReach", label: "Merge reach", min: 0, max: 2.4, step: 0.01 },
      { key: "flowArc", label: "Flow arc", min: 0, max: 2.2, step: 0.01 },
    ],
  },
  {
    title: "Texture motion",
    items: [
      { key: "localMotion", label: "Local motion", min: 0, max: 2.2, step: 0.01 },
      { key: "localSpeed", label: "Local speed", min: 0.2, max: 2.4, step: 0.01 },
      { key: "waveFlow", label: "Wave flow", min: 0, max: 2.4, step: 0.01 },
      { key: "backgroundMotion", label: "Sparse motion", min: 0, max: 2.4, step: 0.01 },
      { key: "foregroundMotion", label: "Dense motion", min: 0, max: 2, step: 0.01 },
      { key: "backgroundSpeed", label: "Sparse speed", min: 0.2, max: 2.2, step: 0.01 },
      { key: "foregroundSpeed", label: "Dense speed", min: 0.2, max: 2.2, step: 0.01 },
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
      { key: "globalDotSize", label: "Overall size", min: 0.5, max: 1.8, step: 0.01 },
      { key: "backgroundDotSize", label: "Sparse size", min: 0.6, max: 2.8, step: 0.01 },
      { key: "foregroundDotSize", label: "Dense size", min: 0.6, max: 2.2, step: 0.01 },
      { key: "orbDotSize", label: "Orb size", min: 0.6, max: 1.8, step: 0.01 },
      { key: "orbSolidFill", label: "Orb solid fill", min: 0, max: 1, step: 0.01 },
      { key: "dotProtection", label: "Dot protection", min: 0, max: 1.8, step: 0.01 },
      { key: "hoverSpacing", label: "Dot spacing", min: 0, max: 1.8, step: 0.01 },
      { key: "denseExitShrink", label: "Dense exit shrink", min: 0, max: 1.4, step: 0.01 },
      { key: "motionCohesion", label: "Motion cohesion", min: 0, max: 1.8, step: 0.01 },
      { key: "foregroundCircleAmount", label: "Field density", min: 0.5, max: 2.5, step: 0.01 },
      { key: "sunPointPopulation", label: "Orb density", min: 0.5, max: 3, step: 0.01 },
    ],
  },
];
const COLOR_CONTROLS = [
  { key: "backgroundColor", label: "Background" },
  { key: "dotColor", label: "Dots / orb" },
];

const DOT_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    float radius = length(centered);
    float mask = 1.0 - smoothstep(0.455, 0.5, radius);

    float alpha = mask * vAlpha;

    if (alpha <= 0.001) {
      discard;
    }

    gl_FragColor = vec4(uColor, alpha);
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
    gl_PointSize = aSize * uPixelRatio;
    vAlpha = aAlpha;
  }
`;

const SOLID_ORB_VERTEX_SHADER = `
  precision highp float;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SOLID_ORB_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uColor;
  uniform float uAlpha;

  void main() {
    gl_FragColor = vec4(uColor, uAlpha);
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

function lerpCycle(start, end, t) {
  const delta = ((((end - start) + 0.5) % 1) + 1) % 1 - 0.5;

  return (start + (delta * t) + 1) % 1;
}

function formatControlValue(value) {
  return Number(value).toFixed(2);
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function pickGenerationControls(controls) {
  return {
    foregroundCircleAmount: controls.foregroundCircleAmount,
    sunPointPopulation: controls.sunPointPopulation,
    dotProtection: controls.dotProtection,
  };
}

function hash01(a, b, seed = 0) {
  const value = Math.sin((a * 127.1) + (b * 311.7) + (seed * 74.7)) * 43758.5453123;
  return value - Math.floor(value);
}

function getStructuredThreshold(cellX, cellY, x, y) {
  const ordered = (BAYER_8[((cellY & 7) * 8) + (cellX & 7)] + 0.5) / 64;
  const wobble = hash01(x, y, 73);

  return clamp((ordered * 0.93) + (wobble * 0.07), 0, 1);
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
    const radius = orb.radius * ((scaleX + scaleY) * 0.5) * 0.68;
    const distance = Math.hypot(x - centerX, y - centerY);
    mask = Math.max(mask, smoothstep(radius, radius * 0.58, distance));
  }

  return mask * (1 - sunProtection);
}

function getPrimaryOrbMask(x, y, width, height) {
  const scaleX = width / REFERENCE_WIDTH;
  const scaleY = height / REFERENCE_HEIGHT;
  const centerX = SUN_PROTECT_MASK.x * scaleX;
  const centerY = SUN_PROTECT_MASK.y * scaleY;
  const radius = SUN_PROTECT_MASK.radius * ((scaleX + scaleY) * 0.5);
  const distance = Math.hypot(x - centerX, y - centerY);

  return smoothstep(radius * 1.02, radius * 0.72, distance);
}

function getPrimaryOrbProfile(x, y, width, height) {
  const scaleX = width / REFERENCE_WIDTH;
  const scaleY = height / REFERENCE_HEIGHT;
  const centerX = SUN_PROTECT_MASK.x * scaleX;
  const centerY = SUN_PROTECT_MASK.y * scaleY;
  const radius = SUN_PROTECT_MASK.radius * ((scaleX + scaleY) * 0.5);
  const distance = Math.hypot(x - centerX, y - centerY);
  const mask = smoothstep(radius * 1.02, radius * 0.72, distance);
  const vertical = (y - centerY) / radius;
  const topSolid = mask * (1 - smoothstep(-0.26, 0.08, vertical));
  const lowerTexture = mask * smoothstep(-0.18, 0.44, vertical);
  const rim = mask * smoothstep(radius * 0.52, radius * 0.98, distance);

  return { mask, topSolid, lowerTexture, rim };
}

function getPrimaryOrbWorld(width, height) {
  const scaleX = width / REFERENCE_WIDTH;
  const scaleY = height / REFERENCE_HEIGHT;
  const centerX = SUN_PROTECT_MASK.x * scaleX;
  const centerY = SUN_PROTECT_MASK.y * scaleY;
  const radius = SUN_PROTECT_MASK.radius * ((scaleX + scaleY) * 0.5);

  return {
    x: centerX - (width / 2),
    y: (height / 2) - centerY,
    radius,
  };
}

function getContinuityFloor(x, y, width, height) {
  const lowerField = smoothstep(height * 0.43, height * 0.96, y);
  const horizonField = smoothstep(height * 0.68, height * 0.28, y)
    * smoothstep(width * 0.06, width * 0.36, x)
    * (1 - smoothstep(width * 0.86, width * 1.02, x));
  const grain = hash01(x, y, 4361) - 0.5;

  return {
    brightness: clamp(0.012 + (lowerField * 0.16) + (horizonField * 0.04) + (grain * 0.004), 0, 0.24),
    concentration: clamp(0.018 + (lowerField * 0.155) + (horizonField * 0.034) + (grain * 0.004), 0, 0.24),
  };
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

function readSoftBrightnessGuide(pixels, width, x, y, spread) {
  const near = spread * 2.4;
  const far = spread * 6.4;
  const wide = spread * 12;
  const center = readBrightness(pixels, width, x, y) * 0.2;
  const nearAxial = (
    readBrightness(pixels, width, x - near, y) +
    readBrightness(pixels, width, x + near, y) +
    readBrightness(pixels, width, x, y - near) +
    readBrightness(pixels, width, x, y + near)
  ) * 0.09;
  const nearDiagonal = (
    readBrightness(pixels, width, x - near, y - near) +
    readBrightness(pixels, width, x + near, y - near) +
    readBrightness(pixels, width, x - near, y + near) +
    readBrightness(pixels, width, x + near, y + near)
  ) * 0.046;
  const farAxial = (
    readBrightness(pixels, width, x - far, y) +
    readBrightness(pixels, width, x + far, y) +
    readBrightness(pixels, width, x, y - far) +
    readBrightness(pixels, width, x, y + far)
  ) * 0.034;
  const farDiagonal = (
    readBrightness(pixels, width, x - far, y - far) +
    readBrightness(pixels, width, x + far, y - far) +
    readBrightness(pixels, width, x - far, y + far) +
    readBrightness(pixels, width, x + far, y + far)
  ) * 0.018;
  const wideAxial = (
    readBrightness(pixels, width, x - wide, y) +
    readBrightness(pixels, width, x + wide, y) +
    readBrightness(pixels, width, x, y - wide) +
    readBrightness(pixels, width, x, y + wide)
  ) * 0.006;

  return center + nearAxial + nearDiagonal + farAxial + farDiagonal + wideAxial;
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

function getOffscreenDistanceFromPoint(x, y, directionX, directionY, width, height, margin) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const distances = [];

  if (Math.abs(directionX) > 0.0001) {
    distances.push(directionX > 0
      ? ((halfWidth + margin) - x) / directionX
      : ((-halfWidth - margin) - x) / directionX);
  }

  if (Math.abs(directionY) > 0.0001) {
    distances.push(directionY > 0
      ? ((halfHeight + margin) - y) / directionY
      : ((-halfHeight - margin) - y) / directionY);
  }

  const positiveDistances = distances.filter((distance) => distance > 0);
  const exitDistance = positiveDistances.length > 0 ? Math.min(...positiveDistances) : margin;

  return exitDistance + margin;
}

function addLivingMotionProperties(store, focus, width, height) {
  const offscreenMargin = Math.max(18, focus.radius * 0.18);

  for (const particle of store.particles) {
    const dx = particle.baseX - focus.x;
    const dy = particle.baseY - focus.y;
    const focusDistance = Math.max(0.0001, Math.hypot(dx, dy));
    const orbMask = smoothstep(focus.radius * 1.08, focus.radius * 0.72, focusDistance);
    const fieldMask = 1 - orbMask;
    const vertical = clamp(dy / focus.radius, -1, 1);
    const topSolidMask = orbMask * smoothstep(-0.08, 0.48, vertical);
    const lowerOrbTexture = orbMask * (1 - topSolidMask);
    const sparseField = clamp(1 - particle.concentration, 0, 1);
    const toFocusX = -dx / focusDistance;
    const toFocusY = -dy / focusDistance;
    const outwardX = dx / focusDistance;
    const outwardY = dy / focusDistance;
    const pathNoise = hash01(particle.baseX, particle.baseY, 8101);
    const distanceToOrbEdge = Math.max(0, focusDistance - (focus.radius * 0.9));
    const offscreenDistance = getOffscreenDistanceFromPoint(
      particle.baseX,
      particle.baseY,
      outwardX,
      outwardY,
      width,
      height,
      offscreenMargin * (0.84 + (pathNoise * 0.32))
    );
    const fullArrivalDistance = Math.max(0, focusDistance - (focus.radius * 0.7))
      + (focus.radius * (0.16 + (hash01(particle.baseX, particle.baseY, 8107) * 0.08)));
    const localConveyorSpan = (
      (fieldMask * (9 + (sparseField * 17) + (particle.concentration * 7) + (clamp(distanceToOrbEdge, 0, focus.radius * 2.6) * 0.032)))
        + (lowerOrbTexture * 4.6)
        + (topSolidMask * 1.35)
    ) * (0.78 + (pathNoise * 0.32));
    const arrivalSpan = (
      (fieldMask * clamp((distanceToOrbEdge * 0.34) + 12, 18, focus.radius * 1.24))
        + (lowerOrbTexture * 5.4)
        + (topSolidMask * 1.8)
    ) * (0.82 + (hash01(particle.baseX, particle.baseY, 8111) * 0.28));
    const inwardSpan = localConveyorSpan + arrivalSpan;
    const upperWaveMask = fieldMask
      * smoothstep(focus.y - (focus.radius * 1.85), focus.y + (focus.radius * 0.42), particle.baseY)
      * smoothstep(focus.radius * 0.72, focus.radius * 3.8, focusDistance)
      * (1 - smoothstep(focus.radius * 5.2, focus.radius * 6.4, focusDistance))
      * (0.28 + (particle.concentration * 0.72));
    const baseRadius = 0.34
      + (topSolidMask * 0.14)
      + (lowerOrbTexture * 0.34)
      + (fieldMask * (0.44 + (sparseField * 0.8)));
    const phaseSeed = hash01(particle.baseX, particle.baseY, 8123);
    const tangentX = -dy / focusDistance;
    const tangentY = dx / focusDistance;
    const anglePhase = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
    const spatialWave = Math.sin((particle.baseX * 0.0042) - (particle.baseY * 0.0036)) * 0.7;
    const coherentPhase = (particle.baseX * 0.0062) + (particle.baseY * 0.0048) + spatialWave;
    const waveSide = dx < 0 ? -1 : 1;
    const waveArcX = (-dy / focusDistance) * waveSide;
    const waveArcY = (dx / focusDistance) * waveSide;
    const waveX = (waveArcX * 0.92) + (toFocusX * 0.42);
    const waveY = (waveArcY * 0.92) + (toFocusY * 0.24);
    const waveLength = Math.max(0.0001, Math.hypot(waveX, waveY));

    particle.livingPhase = phaseSeed * Math.PI * 2;
    particle.livingSpeed = 0.16 + (hash01(particle.baseX, particle.baseY, 8137) * 0.14);
    particle.coherentPhase = coherentPhase;
    particle.coherentSpeed = 0.16 + (fieldMask * 0.11) + (sparseField * 0.04);
    particle.coherentLivingPhase = coherentPhase + (anglePhase * Math.PI * 0.7);
    particle.coherentMicroPhase = (coherentPhase * 1.38) + (anglePhase * Math.PI * 0.32);
    particle.livingRadiusX = baseRadius * (0.72 + (hash01(particle.baseX, particle.baseY, 8147) * 0.42));
    particle.livingRadiusY = baseRadius * (0.46 + (hash01(particle.baseX, particle.baseY, 8161) * 0.34));
    particle.livingTangentX = tangentX;
    particle.livingTangentY = tangentY;
    particle.livingTangentAmount = 0.08 + (fieldMask * (0.2 + (particle.concentration * 0.52))) + (lowerOrbTexture * 0.12);
    particle.livingPulse = 0.008 + (fieldMask * 0.01) + (lowerOrbTexture * 0.008);
    particle.microPhase = hash01(particle.baseX, particle.baseY, 8237) * Math.PI * 2;
    particle.microSpeed = 0.2 + (hash01(particle.baseX, particle.baseY, 8243) * 0.18);
    particle.microRadiusX = 0.34 + (fieldMask * (0.34 + (sparseField * 0.44))) + (lowerOrbTexture * 0.16);
    particle.microRadiusY = 0.28 + (fieldMask * (0.26 + (sparseField * 0.32))) + (lowerOrbTexture * 0.14);
    particle.alivePhase = coherentPhase + (hash01(particle.baseX, particle.baseY, 8251) * 0.24);
    particle.aliveSpeed = 0.18 + (fieldMask * 0.08) + (sparseField * 0.035);
    particle.aliveRadius = 1.18 + (fieldMask * 0.86) + (sparseField * 0.42) + (lowerOrbTexture * 0.32);
    particle.aliveDriftX = (waveX / waveLength) * 0.72 + (tangentX * 0.28);
    particle.aliveDriftY = (waveY / waveLength) * 0.72 + (tangentY * 0.28);
    particle.waveFlowMask = upperWaveMask;
    particle.waveFlowX = waveX / waveLength;
    particle.waveFlowY = waveY / waveLength;
    particle.waveFlowSpan = (2.2 + (sparseField * 1.2) + (particle.concentration * 1.1)) * upperWaveMask;
    particle.waveFlowSpeed = 0.055 + (hash01(particle.baseX, particle.baseY, 8179) * 0.045);
    particle.inwardCyclePhase = hash01(particle.baseX, particle.baseY, 8191);
    particle.inwardCycleSpeed = 0.062 + (fieldMask * 0.07) + (hash01(particle.baseX, particle.baseY, 8209) * 0.034);
    particle.coherentInwardCyclePhase = particle.inwardCyclePhase;
    particle.coherentInwardCycleSpeed = 0.072 + (fieldMask * 0.058) + (sparseField * 0.012);
    particle.inwardCycleSpan = inwardSpan;
    particle.inwardCycleOrbMask = orbMask;
    particle.inwardCycleNearOrb = smoothstep(focus.radius * 1.28, focus.radius * 0.84, focusDistance);
    particle.inwardCycleEdgeMask = smoothstep(focus.radius * 1.52, focus.radius * 0.98, focusDistance);
    particle.inwardCycleOffscreen = (fieldMask * offscreenDistance) + (lowerOrbTexture * 3.2) + (topSolidMask * 1.2);
    particle.inwardCycleToOrb = (fieldMask * fullArrivalDistance) + (lowerOrbTexture * 5.8) + (topSolidMask * 1.8);
    particle.inwardCycleOuter = (
      localConveyorSpan * (0.88 + (hash01(particle.baseX, particle.baseY, 8213) * 0.22))
    ) + (
      fieldMask
        * smoothstep(focus.radius * 1.42, focus.radius * 0.92, focusDistance)
        * Math.max(0, (focus.radius * 1.34) - focusDistance)
        * (0.9 + (pathNoise * 0.18))
    );
    particle.inwardCycleSource = localConveyorSpan * (0.18 + (hash01(particle.baseX, particle.baseY, 8217) * 0.18));
    particle.inwardCycleArrivalSpan = arrivalSpan;
    particle.inwardCycleMerge = 1.8 + (fieldMask * 4.8) + (lowerOrbTexture * 1.6);
    particle.inwardCycleX = toFocusX;
    particle.inwardCycleY = toFocusY;
    particle.inwardCycleNormalX = tangentX;
    particle.inwardCycleNormalY = tangentY;
    particle.inwardCycleArc = (hash01(particle.baseX, particle.baseY, 8221) - 0.5) * (0.45 + (fieldMask * 1.35));
    particle.inwardCycleArrival = orbMask;
  }
}

function buildUnifiedParticles(pixels, width, height, generationControls) {
  const store = createParticleStore();
  const foregroundCircleAmount = generationControls.foregroundCircleAmount ?? 1;
  const sunPointPopulation = generationControls.sunPointPopulation ?? 1;
  const dotProtection = clamp(generationControls.dotProtection ?? 0, 0, 1.8);
  const sunContinuity = smoothstep(0.5, 3, sunPointPopulation);
  const protectionDensity = 1 - clamp(dotProtection * 0.24, 0, 0.36);
  const protectionCompanions = 1 - clamp(dotProtection * 0.46, 0, 0.72);

  const baseStep = clamp(Math.min(width, height) / 245, MIN_PARTICLE_STEP, MAX_PARTICLE_STEP);
  const step = baseStep * (1 + (dotProtection * 0.24));
  const localSpread = step * 1.15;

  for (let y = step * 0.5, cellY = 0; y < height; y += step, cellY += 1) {
    for (let x = step * 0.5, cellX = 0; x < width; x += step, cellX += 1) {
      const jitterX = (hash01(x, y, 19) - 0.5) * step * 0.04;
      const jitterY = (hash01(x, y, 41) - 0.5) * step * 0.04;
      const sampleX = clamp(Math.round(x + jitterX), 0, width - 1);
      const sampleY = clamp(Math.round(y + jitterY), 0, height - 1);
      const sourceBrightness = readBrightness(pixels, width, sampleX, sampleY);
      const localBrightness = readLocalBrightnessAverage(pixels, width, sampleX, sampleY, localSpread);
      const softBrightness = readSoftBrightnessGuide(pixels, width, sampleX, sampleY, step);
      const orbProfile = getPrimaryOrbProfile(sampleX, sampleY, width, height);
      const primaryOrbMask = orbProfile.mask;
      const orbMask = getSuppressedOrbMask(sampleX, sampleY, width, height);
      const continuityFloor = getContinuityFloor(sampleX, sampleY, width, height);
      const lowerDensityBias = smoothstep(height * 0.42, height * 0.95, sampleY) * (1 - primaryOrbMask);
      let brightness = clamp(Math.max(
        continuityFloor.brightness + (lowerDensityBias * 0.035),
        (softBrightness * 0.72) + (localBrightness * 0.22) + (sourceBrightness * 0.018)
      ), 0, 1);
      let concentration = Math.pow(clamp(Math.max(
        continuityFloor.concentration + (lowerDensityBias * 0.055),
        (softBrightness * 0.74) + (localBrightness * 0.2)
      ), 0, 1), 1.2);

      if (primaryOrbMask > 0.001) {
        const orbGrain = hash01(sampleX, sampleY, 4387) - 0.5;
        const orbBrightness = 0.9 + (orbProfile.topSolid * 0.12) + (orbProfile.lowerTexture * 0.04) + (orbGrain * 0.01);
        const orbConcentration = 0.92 + (orbProfile.topSolid * 0.1) + (orbProfile.lowerTexture * 0.04) + (orbGrain * 0.008);

        brightness = lerp(brightness, Math.max(brightness, orbBrightness), primaryOrbMask * 0.98);
        concentration = lerp(concentration, Math.max(concentration, orbConcentration), primaryOrbMask * 0.98);
      }

      if (orbMask > 0.001) {
        const compactBrightness = Math.min(brightness, 0.26 + (lowerDensityBias * 0.08));
        const compactConcentration = Math.min(concentration, 0.3 + (lowerDensityBias * 0.1));

        brightness = lerp(brightness, compactBrightness, orbMask * 0.86);
        concentration = lerp(concentration, compactConcentration, orbMask * 0.86);
      }

      const foregroundMask = smoothstep(0.32, 0.92, concentration);
      const foregroundChanceScale = lerp(1, foregroundCircleAmount, foregroundMask);
      const density = Math.pow(brightness, 1.48);
      const presence = clamp((density * 0.58) + (concentration * 0.94), 0, 1.25);

      if (presence < 0.052) {
        continue;
      }

      const worldX = sampleX - width / 2;
      const worldY = height / 2 - sampleY;
      const continuityChance = (smoothstep(0.22, 0.7, brightness) * 0.28) + (continuityFloor.concentration * 0.14);
      const primaryOrbChance = primaryOrbMask * lerp(0.988, 0.9995, sunContinuity);
      const drawChance = clamp(Math.max(
        ((density * 0.7) + (concentration * 0.82)) * foregroundChanceScale * protectionDensity,
        (continuityChance + (lowerDensityBias * 0.24)) * protectionDensity,
        primaryOrbChance * lerp(1, 0.9, clamp(dotProtection / 1.8, 0, 1))
      ), 0, 0.998);

      if (getStructuredThreshold(cellX, cellY, sampleX, sampleY) > drawChance) {
        continue;
      }

      const amplitude = 0.26 + ((1 - concentration) * 0.58);
      const hoverRadius = 1.8 + ((1 - concentration) * 4.4) + (hash01(sampleX, sampleY, 131) * 0.7);
      const toneForSize = clamp(
        (density * 0.32)
          + (concentration * 0.7)
          + (orbProfile.topSolid * 0.7)
          + (orbProfile.lowerTexture * 0.24),
        0,
        1
      );
      const sparseBand = toneForSize < 0.22 ? -0.08 : 0;
      const midBand = toneForSize > 0.42 ? 0.28 : 0;
      const brightBand = toneForSize > 0.74 ? 0.72 : 0;
      const orbWeight = (orbProfile.topSolid * 1.52) + (orbProfile.lowerTexture * 0.62) + (orbProfile.rim * 0.18);
      const size = 0.42
        + (Math.pow(toneForSize, 0.56) * 2.92)
        + sparseBand
        + midBand
        + brightBand
        + orbWeight
        + (hash01(sampleX, sampleY, 97) * 0.055);
      const alpha = 1;
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
          alpha: 1,
          amplitude: amplitude * 0.94,
          hoverRadius: hoverRadius * 0.96,
          hoverSpeed: hoverSpeed * 1.02,
          concentration: concentration * 0.94,
          phase: hash01(sampleX, sampleY, 223 + seedOffset) * Math.PI * 2,
          speed: speed * 1.04,
        });
      }

      const companionChance = clamp((((concentration - 0.66) * 0.64) + (orbProfile.topSolid * 0.38) + (orbProfile.lowerTexture * 0.18)) * foregroundChanceScale * protectionCompanions, 0, 0.68);

      if (hash01(sampleX, sampleY, 173) < companionChance) {
        pushCompanion(0, primaryOrbMask > 0.35 ? 0.46 : 0.92, primaryOrbMask > 0.35 ? 0.72 : 0.78, primaryOrbMask > 0.35 ? 0.6 : 0.68);
      }

      const extraForegroundChance = clamp((((foregroundCircleAmount - 1) * 0.32 * foregroundMask) + (orbProfile.topSolid * 0.34) + (orbProfile.lowerTexture * 0.12)) * protectionCompanions, 0, 0.62);

      if (extraForegroundChance > 0 && hash01(sampleX, sampleY, 257) < extraForegroundChance) {
        pushCompanion(53, primaryOrbMask > 0.35 ? 0.42 : 0.84, primaryOrbMask > 0.35 ? 0.62 : 0.78, primaryOrbMask > 0.35 ? 0.48 : 0.68);
      }

      const orbFillChance = clamp(primaryOrbMask * 0.34 * lerp(1, 0.72, clamp(dotProtection / 1.8, 0, 1)), 0, 0.34);

      if (orbFillChance > 0 && hash01(sampleX, sampleY, 307) < orbFillChance) {
        pushCompanion(107, orbProfile.topSolid > 0.2 ? 0.28 : 0.36, orbProfile.topSolid > 0.2 ? 0.58 : 0.52, orbProfile.topSolid > 0.2 ? 0.46 : 0.42);
      }
    }
  }

  const focus = getPrimaryOrbWorld(width, height);
  addLivingMotionProperties(store, focus, width, height);

  const finalized = finalizeParticleStore(store);
  finalized.focus = focus;
  finalized.primaryOrb = focus;
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
    toneMapped: false,
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
    camera.manual = true;
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.near = -100;
    camera.far = 100;
    camera.zoom = 1;
    camera.position.set(0, 0, 10);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}

function UnifiedPointCloud({ data, controls }) {
  const pointsRef = useRef(null);
  const continuityRef = useRef(null);
  const material = useMemo(() => createDotMaterial(SIMPLE_VERTEX_SHADER, "#e9dfd0"), []);
  const { gl } = useThree();

  useEffect(() => {
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();

    return () => {
      material.dispose();
    };
  }, [gl, material]);

  useEffect(() => {
    if (isHexColor(controls.dotColor)) {
      material.uniforms.uColor.value.set(controls.dotColor);
    }
  }, [controls.dotColor, material]);

  useEffect(() => {
    continuityRef.current = {
      previousX: new Float32Array(data.particles.length),
    previousY: new Float32Array(data.particles.length),
    previousSize: new Float32Array(data.particles.length),
    previousAlpha: new Float32Array(data.particles.length),
    renderedVisible: new Uint8Array(data.particles.length),
    initialized: new Uint8Array(data.particles.length),
  };
  }, [data]);

  useFrame((state, delta) => {
    if (!pointsRef.current) {
      return;
    }

    const elapsed = state.clock.elapsedTime;
    const geometry = pointsRef.current.geometry;
    const positions = geometry.attributes.position.array;
    const sizes = geometry.attributes.aSize.array;
    const alphas = geometry.attributes.aAlpha.array;
    const continuity = continuityRef.current;
    const safeDelta = clamp(delta || (1 / 60), 1 / 120, 1 / 24);
    const halfWidth = data.width / 2;
    const halfHeight = data.height / 2;
    const viewportMargin = 24;
    const globalMotion = 0.16 + ((controls.globalMotion ?? 1) * 0.84);
    const globalSpeed = controls.globalSpeed ?? 1;
    const localMotionControl = 0.22 + ((controls.localMotion ?? 1) * 0.78);
    const localSpeedControl = controls.localSpeed ?? 1;
    const flowSpeedControl = controls.flowSpeed ?? 1;
    const inwardFlowControl = controls.inwardFlow ?? 1;
    const flowDistanceControl = controls.flowDistance ?? 1;
    const respawnSpreadControl = controls.respawnSpread ?? 1;
    const mergeReachControl = controls.mergeReach ?? 1;
    const flowArcControl = controls.flowArc ?? 1;
    const waveFlowControl = controls.waveFlow ?? 1;
    const dotProtectionControl = clamp(controls.dotProtection ?? 0, 0, 1.8);
    const hoverSpacingControl = clamp(controls.hoverSpacing ?? 1.2, 0, 1.8);
    const denseExitShrinkControl = clamp(controls.denseExitShrink ?? 1, 0, 1.4);
    const spacingCoherence = clamp(hoverSpacingControl / 1.8, 0, 1);
    const protectionMotionScale = 1 - clamp(dotProtectionControl * 0.1, 0, 0.18);
    const spacingMotionScale = 1 - clamp(hoverSpacingControl * 0.14, 0, 0.24);
    const lateralMotionScale = 1 - clamp(spacingCoherence * 0.7, 0, 0.7);
    const arcMotionScale = 1 - clamp(spacingCoherence * 0.82, 0, 0.82);
    const cohesion = clamp((controls.motionCohesion ?? 1.12) / 1.8, 0, 1);
    const sparseMotion = 0.18 + ((controls.backgroundMotion ?? 1) * 0.82);
    const denseMotion = 0.18 + ((controls.foregroundMotion ?? 1) * 0.82);

    for (let index = 0; index < data.particles.length; index += 1) {
      const particle = data.particles[index];
      const visualConcentration = particle.concentration;
      const backgroundMix = clamp(1 - visualConcentration, 0, 1);
      const motionScale = globalMotion * lerp(denseMotion, sparseMotion, backgroundMix);
      const speedScale = globalSpeed * lerp(controls.foregroundSpeed, controls.backgroundSpeed, backgroundMix);
      const localMotionScale = motionScale * localMotionControl * protectionMotionScale * spacingMotionScale;
      const localSpeedScale = speedScale * localSpeedControl;
      const sizeScale = controls.globalDotSize * lerp(controls.foregroundDotSize, controls.backgroundDotSize, backgroundMix);
      const orbInteriorSize = smoothstep(0.62, 0.94, particle.inwardCycleOrbMask ?? 0);
      const orbSizeBoost = 1 + (orbInteriorSize * ((controls.orbDotSize ?? 1) - 1));
      const phase = lerp(particle.phase, particle.coherentPhase ?? particle.phase, cohesion);
      const particleSpeed = lerp(particle.speed, particle.coherentSpeed ?? particle.speed, cohesion * 0.86);
      const fieldX = Math.sin((particle.baseY * 0.009) + (elapsed * 0.2 * localSpeedScale) + phase) * particle.amplitude * 1.12 * controls.fieldAmount * localMotionScale * lateralMotionScale;
      const fieldY = Math.cos((particle.baseX * 0.008) - (elapsed * 0.18 * localSpeedScale) + (phase * 0.7)) * particle.amplitude * 1.12 * controls.fieldAmount * localMotionScale * lateralMotionScale;
      const driftX = Math.sin((elapsed * particleSpeed * localSpeedScale) + phase) * particle.amplitude * 1.55 * controls.driftAmount * localMotionScale * lateralMotionScale;
      const driftY = Math.cos((elapsed * (particleSpeed * 0.9) * localSpeedScale) + (phase * 1.31)) * particle.amplitude * 1.55 * controls.driftAmount * localMotionScale * lateralMotionScale;
      const ambientHover = (particle.hoverRadius ?? (1.6 + ((1 - visualConcentration) * 3.8))) * controls.hoverAmount * localMotionScale;
      const hoverSpeed = lerp(particle.hoverSpeed ?? 0.22, 0.22 + (backgroundMix * 0.06), cohesion * 0.72) * localSpeedScale;
      const hoverWave = Math.sin((elapsed * hoverSpeed) + (phase * 0.8));
      const hoverCross = Math.cos((elapsed * (hoverSpeed * 0.94)) + (phase * 1.1));
      const freeHoverX = hoverWave * ambientHover;
      const freeHoverY = hoverCross * ambientHover;
      const spacedHoverX = ((particle.aliveDriftX ?? particle.inwardCycleX) * hoverWave * ambientHover * 0.58)
        + ((particle.inwardCycleNormalX ?? 0) * hoverCross * ambientHover * 0.18);
      const spacedHoverY = ((particle.aliveDriftY ?? particle.inwardCycleY) * hoverWave * ambientHover * 0.58)
        + ((particle.inwardCycleNormalY ?? 0) * hoverCross * ambientHover * 0.18);
      const hoverX = lerp(freeHoverX, spacedHoverX, spacingCoherence);
      const hoverY = lerp(freeHoverY, spacedHoverY, spacingCoherence);
      const swayRadius = ambientHover * 0.46 * controls.swayAmount;
      const swayX = Math.cos((elapsed * ((hoverSpeed * 0.7) + 0.08)) + (phase * 1.9)) * swayRadius * lateralMotionScale;
      const swayY = Math.sin((elapsed * ((hoverSpeed * 0.62) + 0.06)) + (phase * 1.4)) * swayRadius * lateralMotionScale;
      const tideRadius = ambientHover * 0.26 * controls.tideAmount;
      const tideX = Math.sin((particle.baseY * 0.0028) + (elapsed * 0.12 * localSpeedScale) + (phase * 0.35)) * tideRadius * lateralMotionScale;
      const tideY = Math.cos((particle.baseX * 0.0025) - (elapsed * 0.11 * localSpeedScale) + (phase * 0.42)) * tideRadius * lateralMotionScale;
      let x = particle.baseX + driftX + fieldX + hoverX + swayX + tideX;
      let y = particle.baseY + driftY + fieldY + hoverY + swayY + tideY;
      let size = particle.size * sizeScale * orbSizeBoost;
      let alpha = particle.alpha;
      let travelSizeScale = 1;
      let hadPreviousFrame = false;

      if ((particle.inwardCycleSpan ?? 0) > 0.001) {
        const inwardPhase = lerpCycle(
          particle.inwardCyclePhase,
          particle.coherentInwardCyclePhase ?? particle.inwardCyclePhase,
          cohesion
        );
        const inwardSpeed = lerp(
          particle.inwardCycleSpeed,
          particle.coherentInwardCycleSpeed ?? particle.inwardCycleSpeed,
          cohesion * 0.88
        );
        const rawCycle = (elapsed * inwardSpeed * (0.88 + (globalSpeed * 0.26)) * flowSpeedControl) + inwardPhase;
        const loop = rawCycle - Math.floor(rawCycle);
        const motionAmount = (0.86 + (globalMotion * 0.36)) * inwardFlowControl;
        const outer = (particle.inwardCycleOuter ?? (particle.inwardCycleSpan * 0.48)) * motionAmount * respawnSpreadControl;
        const source = (particle.inwardCycleSource ?? (particle.inwardCycleSpan * 0.14)) * motionAmount * (0.76 + (respawnSpreadControl * 0.24));
        const arrival = (particle.inwardCycleArrivalSpan ?? (particle.inwardCycleSpan * 0.38)) * motionAmount * flowDistanceControl;
        const merge = (particle.inwardCycleMerge ?? 3.2) * motionAmount * mergeReachControl;
        const orbLoopMask = particle.inwardCycleOrbMask ?? 0;
        const edgeMask = particle.inwardCycleEdgeMask ?? 0;
        const travelT = 1 - Math.pow(1 - loop, 1.28);
        const denseTraveler = smoothstep(0.44, 0.92, visualConcentration) * (1 - orbLoopMask);
        const offscreen = Math.max(
          outer + (source * 0.35),
          particle.inwardCycleOffscreen ?? (outer + source)
        ) * (0.74 + (respawnSpreadControl * 0.26));
        const fullArrival = (particle.inwardCycleToOrb ?? arrival)
          * motionAmount
          * (0.92 + (flowDistanceControl * 0.18));
        const orbStaticMask = smoothstep(0.34, 0.82, orbLoopMask);
        const activeFlowMask = 1 - orbStaticMask;
        const pathStart = lerp(-offscreen, 0, orbStaticMask);
        const fieldPathEnd = fullArrival + (merge * 0.62);
        const pathEnd = lerp(fieldPathEnd, 0, orbStaticMask);
        const baseCrossT = clamp((-pathStart) / Math.max(0.0001, pathEnd - pathStart), 0, 1);
        let pathPosition = lerp(pathStart, pathEnd, travelT);
        let arcT = Math.sin(travelT * Math.PI);

        if (edgeMask > 0.001) {
          const entryT = smoothstep(0.54, 1, travelT);
          pathPosition += edgeMask * entryT * merge * 0.36;
          arcT *= lerp(1, 0.32, edgeMask);
        }

        pathPosition *= activeFlowMask;
        arcT *= activeFlowMask;

        const entryScale = lerp(0.38, 1, smoothstep(0.012, Math.max(0.08, baseCrossT * 0.72), travelT));
        const denseExitAmount = clamp(denseExitShrinkControl / 1.4, 0, 1);
        const denseExitT = smoothstep(baseCrossT, Math.min(0.98, baseCrossT + 0.48), travelT);
        const denseExitScale = lerp(1, lerp(0.62, 0.24, denseExitAmount), denseTraveler * denseExitT * (1 - (edgeMask * 0.55)));
        travelSizeScale *= lerp(entryScale, 1, orbStaticMask) * denseExitScale;

        const arc = particle.inwardCycleArc * (outer + arrival) * 0.34 * arcT * flowArcControl * arcMotionScale;

        x += (particle.inwardCycleX * pathPosition) + (particle.inwardCycleNormalX * arc);
        y += (particle.inwardCycleY * pathPosition) + (particle.inwardCycleNormalY * arc);
      }

      if ((particle.livingRadiusX ?? 0) > 0.001) {
        const livingScale = (0.34 + (globalMotion * 0.72)) * localMotionControl;
        const livingSpeed = (0.72 + (globalSpeed * 0.16)) * particle.livingSpeed * localSpeedControl;
        const livingPhase = lerp(particle.livingPhase, particle.coherentLivingPhase ?? particle.livingPhase, cohesion);
        const livingT = (elapsed * livingSpeed) + livingPhase;
        const localX = (Math.cos(livingT) * particle.livingRadiusX)
          + (Math.sin((livingT * 0.63) + livingPhase) * particle.livingRadiusY * 0.28);
        const localY = (Math.sin(livingT * 0.92) * particle.livingRadiusY)
          + (Math.cos((livingT * 0.57) + livingPhase) * particle.livingRadiusX * 0.2);
        const parallelX = particle.inwardCycleX * Math.sin((livingT * 0.78) + livingPhase) * particle.livingRadiusX * 0.58;
        const parallelY = particle.inwardCycleY * Math.sin((livingT * 0.78) + livingPhase) * particle.livingRadiusX * 0.58;
        const tangentPulse = Math.sin((livingT * 0.41) + livingPhase) * particle.livingTangentAmount;
        const pulse = Math.sin((livingT * 0.73) + livingPhase) * particle.livingPulse;
        const spacedLocalX = lerp(localX, parallelX, spacingCoherence * 0.58);
        const spacedLocalY = lerp(localY, parallelY, spacingCoherence * 0.58);

        x += (spacedLocalX + (particle.livingTangentX * tangentPulse * lateralMotionScale)) * livingScale;
        y += (spacedLocalY + (particle.livingTangentY * tangentPulse * lateralMotionScale)) * livingScale;
        size *= 1 + pulse;
      }

      if ((particle.waveFlowMask ?? 0) > 0.001) {
        const waveTravel = Math.sin(elapsed * 0.16 * (0.85 + (globalSpeed * 0.18)) * flowSpeedControl) * 0.5;
        const waveAmount = particle.waveFlowSpan * (0.55 + (globalMotion * 0.62)) * waveFlowControl;

        x += particle.waveFlowX * waveTravel * waveAmount;
        y += particle.waveFlowY * waveTravel * waveAmount;
      }

      if ((particle.microRadiusX ?? 0) > 0.001) {
        const microPhase = lerp(particle.microPhase, particle.coherentMicroPhase ?? particle.microPhase, cohesion);
        const microT = (elapsed * particle.microSpeed * (0.82 + (globalSpeed * 0.18)) * localSpeedControl) + microPhase;
        const microScale = (0.68 + (globalMotion * 0.32)) * (0.76 + (localMotionControl * 0.34));
        const microX = (Math.cos(microT) * particle.microRadiusX)
          + (Math.sin((microT * 0.47) + microPhase) * particle.microRadiusY * 0.34);
        const microY = (Math.sin(microT * 0.88) * particle.microRadiusY)
          + (Math.cos((microT * 0.53) + microPhase) * particle.microRadiusX * 0.28);
        const microParallelX = particle.inwardCycleX * Math.sin((microT * 0.74) + microPhase) * particle.microRadiusX * 0.48;
        const microParallelY = particle.inwardCycleY * Math.sin((microT * 0.74) + microPhase) * particle.microRadiusX * 0.48;

        x += lerp(microX, microParallelX, spacingCoherence * 0.62) * microScale;
        y += lerp(microY, microParallelY, spacingCoherence * 0.62) * microScale;
      }

      if ((particle.aliveRadius ?? 0) > 0.001) {
        const alivePhase = particle.alivePhase ?? phase;
        const aliveT = (elapsed * particle.aliveSpeed * (0.86 + (globalSpeed * 0.18)) * localSpeedControl) + alivePhase;
        const aliveWave = Math.sin(aliveT);
        const aliveCross = Math.cos((aliveT * 0.73) + alivePhase);
        const aliveScale = (0.72 + (globalMotion * 0.42)) * (0.78 + (localMotionControl * 0.32));
        const aliveRadius = particle.aliveRadius * aliveScale;

        x += (particle.aliveDriftX * aliveWave * aliveRadius)
          + (particle.inwardCycleNormalX * aliveCross * aliveRadius * 0.24 * lateralMotionScale);
        y += (particle.aliveDriftY * aliveWave * aliveRadius)
          + (particle.inwardCycleNormalY * aliveCross * aliveRadius * 0.24 * lateralMotionScale);
      }

      const orb = data.primaryOrb;
      if (continuity && orb) {
        const previousX = continuity.previousX[index];
        const previousY = continuity.previousY[index];
        hadPreviousFrame = continuity.initialized[index] === 1;

        const previousInViewport = previousX > -halfWidth - viewportMargin
          && previousX < halfWidth + viewportMargin
          && previousY > -halfHeight - viewportMargin
          && previousY < halfHeight + viewportMargin;
        const currentInViewport = x > -halfWidth - viewportMargin
          && x < halfWidth + viewportMargin
          && y > -halfHeight - viewportMargin
          && y < halfHeight + viewportMargin;
        const previousInsideOrb = Math.hypot(previousX - orb.x, previousY - orb.y) < orb.radius * 0.9;
        const currentInsideOrb = Math.hypot(x - orb.x, y - orb.y) < orb.radius * 0.9;
        const jumpDistance = hadPreviousFrame ? Math.hypot(x - previousX, y - previousY) : 0;
        const visibleJumpLimit = 86;

        if (
          hadPreviousFrame
          && previousInViewport
          && currentInViewport
          && !previousInsideOrb
          && !currentInsideOrb
          && jumpDistance > visibleJumpLimit
        ) {
          const toOrbX = orb.x - previousX;
          const toOrbY = orb.y - previousY;
          const toOrbLength = Math.max(1, Math.hypot(toOrbX, toOrbY));
          const continuityStep = Math.min(jumpDistance, 7 + (speedScale * 3) + (flowSpeedControl * 4));

          x = previousX + ((toOrbX / toOrbLength) * continuityStep);
          y = previousY + ((toOrbY / toOrbLength) * continuityStep);
        }

        continuity.previousX[index] = x;
        continuity.previousY[index] = y;
        continuity.initialized[index] = 1;
      }

      positions[index * 3] = x;
      positions[(index * 3) + 1] = y;
      positions[(index * 3) + 2] = 0;
      const renderedOrbDistance = orb ? Math.hypot(x - orb.x, y - orb.y) : 9999;
      const renderedOrbEdge = orb ? renderedOrbDistance / orb.radius : 9999;
      const enteringSolidOrb = smoothstep(0.82, 0.62, renderedOrbEdge);
      const contactMelt = smoothstep(1.05, 0.98, renderedOrbEdge) * (1 - smoothstep(0.95, 0.86, renderedOrbEdge));
      const mergeVisibility = 1 - ((controls.orbSolidFill ?? 0) * enteringSolidOrb);
      const finalSize = size * travelSizeScale * (1 + (contactMelt * 0.12));
      const journeySizeFloor = controls.globalDotSize * lerp(0.44, 0, enteringSolidOrb);

      let nextSize = Math.max(finalSize, journeySizeFloor) * mergeVisibility;
  let nextAlpha = alpha * mergeVisibility;

  if (continuity && orb) {
    const renderInViewport = x > -halfWidth - viewportMargin
      && x < halfWidth + viewportMargin
      && y > -halfHeight - viewportMargin
      && y < halfHeight + viewportMargin;
    const renderInsideOrb = renderedOrbDistance < orb.radius * 0.84;
    const wantsVisible = nextAlpha > 0.001 && nextSize > 0.05;
    const wasVisible = continuity.renderedVisible[index] === 1;

    if (
      hadPreviousFrame
      && wasVisible
      && renderInViewport
      && !renderInsideOrb
    ) {
      const previousSize = continuity.previousSize[index];
      const previousAlpha = continuity.previousAlpha[index];

      if (previousSize > 0.05) {
        nextSize = clamp(nextSize, previousSize * 0.84, previousSize * 1.2);
      }

      if (!wantsVisible) {
        nextSize = Math.max(nextSize, previousSize * 0.9);
      }

      nextAlpha = Math.max(nextAlpha, previousAlpha * 0.97);
    }

    continuity.previousSize[index] = nextSize;
        continuity.previousAlpha[index] = nextAlpha;
        continuity.renderedVisible[index] = nextAlpha > 0.001 && nextSize > 0.05 ? 1 : 0;
      }

      sizes[index] = nextSize;
      alphas[index] = nextAlpha;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  });

  return html`
    <points ref=${pointsRef} frustumCulled=${false} renderOrder=${2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args=${[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args=${[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args=${[data.alphas, 1]} />
      </bufferGeometry>
      <primitive object=${material} attach="material" />
    </points>
  `;
}

function SolidOrb({ orb, opacity, color }) {
  const visibleOpacity = clamp(opacity ?? 0, 0, 1);
  const orbColor = isHexColor(color) ? color : MOTION_CONTROLS.dotColor;
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color(orbColor) },
      uAlpha: { value: visibleOpacity },
    },
    vertexShader: SOLID_ORB_VERTEX_SHADER,
    fragmentShader: SOLID_ORB_FRAGMENT_SHADER,
  }), []);

  useEffect(() => {
    material.uniforms.uColor.value.set(orbColor);
    material.uniforms.uAlpha.value = visibleOpacity;
  }, [material, orbColor, visibleOpacity]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  if (!orb || visibleOpacity <= 0.001) {
    return null;
  }

  return html`
    <mesh position=${[orb.x, orb.y, -0.6]} renderOrder=${1}>
      <circleGeometry args=${[orb.radius, 160]} />
      <primitive object=${material} attach="material" />
    </mesh>
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

      <section className="color-group">
        <h3>Colors</h3>
        <div className="color-list">
          ${COLOR_CONTROLS.map((item) => {
            const colorValue = isHexColor(controls[item.key]) ? controls[item.key] : MOTION_CONTROLS[item.key];

            return html`
              <label className="color-row" key=${item.key}>
                <span>${item.label}</span>
                <span className="color-inputs">
                  <input
                    type="color"
                    value=${colorValue}
                    onInput=${(event) => onChange(item.key, event.currentTarget.value)}
                    aria-label=${item.label}
                  />
                  <input
                    type="text"
                    value=${controls[item.key]}
                    spellCheck=${false}
                    onInput=${(event) => onChange(item.key, event.currentTarget.value)}
                    aria-label=${`${item.label} hex`}
                  />
                </span>
              </label>
            `;
          })}
        </div>
      </section>

      <section className="preset-box">
        <div className="preset-head">
          <h3>Preset</h3>
          <button
            className="copy-button"
            type="button"
            onClick=${() => navigator.clipboard?.writeText(preset)}
          >
            Copy
          </button>
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
      <${SolidOrb} orb=${sceneData.stipple.primaryOrb} opacity=${controls.orbSolidFill} color=${controls.dotColor} />
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
    controls.dotProtection,
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
          <div
            className="stage"
            style=${{
              aspectRatio: sceneData ? sceneData.aspectRatio : DEFAULT_ASPECT_RATIO,
              "--stage-top": isHexColor(controls.backgroundColor) ? controls.backgroundColor : MOTION_CONTROLS.backgroundColor,
              "--stage-bottom": isHexColor(controls.backgroundColor) ? controls.backgroundColor : MOTION_CONTROLS.backgroundColor,
            }}
          >
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
