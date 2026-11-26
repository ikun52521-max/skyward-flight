// config.js — Ember Ridge Run: tuning constants and the three missions.
// Every number here is original to this game; nothing is copied from a kit.

export const GAME_TITLE = 'Ember Ridge Run';
export const GAME_TAGLINE = 'Three valleys. Sixteen rings. One runway home.';

export const WORLD = {
  segmentLength: 40, // metres of course per rendered strip
  drawDistance: 300, // segments drawn ahead of the plane
  courseLength: 13200, // metres from takeoff roll to the far runway
  runwayLength: 520,
  groundHalfWidth: 1500, // metres of terrain ribbon either side of the course
  maxSpeed: 96, // m/s at full throttle, level flight
  stallSpeed: 27, // m/s; below this the wing stops flying
  maxPitch: 0.42, // radians, nose up or down
  maxRoll: 1.05, // radians of bank
  gravity: 9.8,
  ringRadius: 26, // metres
  cameraHeight: 7, // metres above the plane
};

export const MISSIONS = [
  {
    id: 0,
    name: 'Dawn Patrol',
    blurb: 'Gentle valleys, ten rings, plenty of fuel. Learn the ridge.',
    rings: 10,
    fuel: 260,
    wind: 0,
    parTime: 150,
    palette: 'dawn',
    seed: 101,
  },
  {
    id: 1,
    name: 'Canyon Rush',
    blurb: 'Fourteen rings through the amber canyon. Watch the walls.',
    rings: 14,
    fuel: 215,
    wind: 0.35,
    parTime: 185,
    palette: 'canyon',
    seed: 207,
  },
  {
    id: 2,
    name: 'Storm Ridge',
    blurb: 'Sixteen rings at dusk in gusting wind. For ridge pilots only.',
    rings: 16,
    fuel: 190,
    wind: 0.8,
    parTime: 215,
    palette: 'storm',
    seed: 313,
  },
];

export const PALETTES = {
  dawn: {
    skyTop: '#7db4e8', skyMid: '#bcd9f2', skyLow: '#f6e3c2',
    sun: '#fff3c4', sunGlow: 'rgba(255, 236, 170, 0.55)',
    farRidge: '#8ba7c4', nearRidge: '#5d7a52',
    valley: '#5f9e4d', meadow: '#79b657', rock: '#8d8578', snow: '#eef3f6',
    sand: '#cbb98a', water: '#5f9dc4', runway: '#3c4148', runwayLine: '#f2f2e8',
    ring: '#ffb02e', ringPass: '#58e08a', cloud: 'rgba(255,255,255,0.85)',
  },
  canyon: {
    skyTop: '#e8975a', skyMid: '#f2c184', skyLow: '#f7ddab',
    sun: '#ffe9a8', sunGlow: 'rgba(255, 200, 120, 0.5)',
    farRidge: '#b06a44', nearRidge: '#7d4a2e',
    valley: '#a86a3c', meadow: '#c08a4e', rock: '#7a4e33', snow: '#e8d9c2',
    sand: '#d9b078', water: '#7a9ab0', runway: '#413832', runwayLine: '#f2ead8',
    ring: '#ffd23e', ringPass: '#58e08a', cloud: 'rgba(255, 240, 210, 0.8)',
  },
  storm: {
    skyTop: '#3a3f66', skyMid: '#6a5a7d', skyLow: '#c97e6a',
    sun: '#ffcf9e', sunGlow: 'rgba(255, 170, 110, 0.4)',
    farRidge: '#4a4360', nearRidge: '#3d3348',
    valley: '#4c5a44', meadow: '#5d7050', rock: '#565064', snow: '#cfd4de',
    sand: '#8a7a5e', water: '#46586e', runway: '#2e2f38', runwayLine: '#e8e4d2',
    ring: '#ff7a3c', ringPass: '#58e08a', cloud: 'rgba(220, 200, 220, 0.55)',
  },
};

// Score values.
export const SCORE = {
  ring: 100,
  ringCenter: 50, // extra when the pass is within half the radius
  landing: 500,
  fuelPerUnit: 3,
  timePerSecond: 5,
};
