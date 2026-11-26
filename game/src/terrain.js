// terrain.js — the ridge: course path, ground height, rings, trees and runways.
// The world is one winding valley. Everything is a pure function of (x, z)
// plus a seeded scatter, so flight, rendering and collision always agree.

import { WORLD, MISSIONS } from './config.js';

/** Deterministic pseudo-random from an integer seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The course centreline wanders through the valley. */
export function courseX(z) {
  return 620 * Math.sin(z * 0.00012) + 340 * Math.sin(z * 0.00031 + 1.7)
    + 150 * Math.sin(z * 0.00083 + 4.1);
}

/** Rolling hills: a few sines layered so the valley never repeats. */
function hillHeight(x, z) {
  return 34
    + 46 * Math.sin(z * 0.0011 + x * 0.0013)
    + 26 * Math.sin(z * 0.0023 - x * 0.0007 + 2.0)
    + 14 * Math.sin(x * 0.0042 + z * 0.0005 + 0.6)
    + 8 * Math.sin(z * 0.0061 + x * 0.0021);
}

/** Valley walls rise steeply once you leave the course corridor. */
function wallHeight(x, z) {
  const dx = Math.abs(x - courseX(z));
  const over = Math.max(0, dx - 950);
  return over * over * 0.00042 + Math.max(0, dx - 1400) * 0.12;
}

/** Is (x, z) on a runway strip? Runways are flat, at height 0. */
export function runwayAt(x, z) {
  const cx = courseX(z);
  if (Math.abs(x - cx) > 55) return false;
  if (z >= 0 && z <= WORLD.runwayLength) return true;
  const end = WORLD.courseLength - WORLD.runwayLength;
  return z >= end && z <= WORLD.courseLength;
}

/** Ground height in metres at world (x, z). */
export function terrainHeight(x, z) {
  if (runwayAt(x, z)) return 0;
  const zz = Math.max(0, Math.min(WORLD.courseLength, z));
  const h = hillHeight(x, zz) + wallHeight(x, zz);
  // Apron: the ground flattens toward each runway so the strip is visible
  // on final approach and the takeoff roll is on flat ground.
  const cx = courseX(zz);
  const dx = Math.max(0, Math.abs(x - cx) - 55);
  const dzStart = zz < WORLD.runwayLength ? 0 : zz - WORLD.runwayLength;
  const dzEnd = zz > WORLD.courseLength - WORLD.runwayLength
    ? 0 : (WORLD.courseLength - WORLD.runwayLength) - zz;
  const dz = Math.min(dzStart, dzEnd);
  const influence = Math.max(0, 1 - dz / 900) * Math.max(0, 1 - dx / 350);
  return h * (1 - influence);
}

/** Height band colour for a ground strip. */
export function groundColor(palette, h) {
  if (h > 105) return palette.snow;
  if (h > 78) return palette.rock;
  if (h > 52) return palette.meadow;
  return palette.valley;
}

/** A ring (target gate) floating over the course. */
export function buildRings(mission) {
  const rings = [];
  const start = 900;
  const end = WORLD.courseLength - WORLD.runwayLength - 900;
  for (let i = 0; i < mission.rings; i++) {
    const t = mission.rings === 1 ? 0.5 : i / (mission.rings - 1);
    const z = start + (end - start) * t;
    const sway = Math.sin(i * 1.93 + mission.seed) * 190;
    const x = courseX(z) + sway;
    const ground = terrainHeight(x, z);
    const alt = ground + 62 + 52 * Math.abs(Math.sin(i * 2.7 + mission.seed * 0.13));
    rings.push({ x, y: alt, z, passed: false, center: false, index: i });
  }
  return rings;
}

/** Scattered trees and rocks along the valley, seeded per mission. */
export function buildScenery(mission) {
  const rnd = mulberry32(mission.seed * 7919 + 13);
  const items = [];
  const count = 420;
  for (let i = 0; i < count; i++) {
    const z = 200 + rnd() * (WORLD.courseLength - 400);
    const side = rnd() < 0.5 ? -1 : 1;
    const off = 130 + rnd() * 1150;
    const x = courseX(z) + side * off;
    const y = terrainHeight(x, z);
    const kind = rnd() < 0.72 ? 'pine' : 'rock';
    const size = kind === 'pine' ? 14 + rnd() * 22 : 8 + rnd() * 16;
    items.push({ x, y, z, kind, size });
  }
  // A lake near the middle of the course, for a recognisable landmark.
  const lakeZ = WORLD.courseLength * 0.52;
  items.push({ x: courseX(lakeZ) - 420, y: 0, z: lakeZ, kind: 'lake', size: 260 });
  return items;
}

/** Ridge silhouette for a distant mountain layer. */
export function ridgePoints(layer, width, seed) {
  const rnd = mulberry32(seed + layer * 977);
  const pts = [];
  const step = 90;
  for (let x = -step; x <= width + step; x += step) {
    const h = 60 + rnd() * (layer === 0 ? 150 : 90) + 40 * Math.sin(x * 0.004 + seed);
    pts.push({ x, h });
  }
  return pts;
}

export { MISSIONS };
