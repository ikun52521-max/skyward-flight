// game.js — the game itself: modes, missions, rings, scoring, landings.
// Owns the state; flight.js owns the physics, render.js the picture.

import { WORLD, MISSIONS, PALETTES, SCORE } from './config.js';
import { buildRings, buildScenery, terrainHeight, courseX } from './terrain.js';
import { newPlane, stepFlight } from './flight.js';

export function createGame() {
  const game = {
    mode: 'title', // title | flying | paused | crashed | landed
    selectedMission: 0,
    mission: MISSIONS[0],
    palette: PALETTES[MISSIONS[0].palette],
    plane: null,
    rings: [],
    scenery: [],
    nextIndex: 0,
    score: 0,
    time: 0,
    flash: '',
    flashUntil: 0,
    groundBelow: 999,
    vs: 0, // vertical speed, shown on the HUD
    attractT: 0,

    startMission(index) {
      this.selectedMission = index;
      this.mission = MISSIONS[index];
      this.palette = PALETTES[this.mission.palette];
      this.plane = newPlane(this.mission);
      this.rings = buildRings(this.mission);
      this.scenery = buildScenery(this.mission);
      this.nextIndex = 0;
      this.score = 0;
      this.time = 0;
      this.flash = '';
      this.groundBelow = 999;
      this.mode = 'flying';
    },

    /** Title-screen attract mode: the plane flies itself down the valley. */
    startAttract() {
      this.mission = MISSIONS[this.selectedMission];
      this.palette = PALETTES[this.mission.palette];
      this.plane = newPlane(this.mission);
      this.plane.y = 150;
      this.plane.z = 2600;
      this.plane.speed = 62;
      this.plane.throttle = 0.62;
      this.rings = buildRings(this.mission);
      this.scenery = buildScenery(this.mission);
      this.nextIndex = 0;
      this.mode = 'title';
    },

    /** One frame. `ctl` is the input control vector; `events` are edge actions. */
    update(dt, ctl, events, audio) {
      if (this.mode === 'title') {
        // Gentle autopilot so the title screen shows the valley in motion.
        this.attractT += dt;
        const p = this.plane;
        p.z += p.speed * dt;
        p.heading = Math.sin(p.z * 0.0004) * 0.06;
        p.roll = Math.sin(p.z * 0.0004 + 1) * 0.18;
        p.pitch = Math.sin(p.z * 0.0009) * 0.05;
        p.y = 150 + Math.sin(p.z * 0.0011) * 30;
        if (p.z > WORLD.courseLength - 800) {
          p.z = 2400;
        }
        if (events.start) {
          audio.start();
          audio.click();
          this.startMission(this.selectedMission);
        }
        if (events.mission !== null && events.mission !== undefined) {
          this.selectedMission = events.mission;
          audio.click();
          this.startAttract();
        }
        return;
      }

      if (this.mode === 'paused') {
        if (events.pause) this.mode = 'flying';
        if (events.restart) this.startMission(this.selectedMission);
        if (events.title) { this.mode = 'title'; this.startAttract(); }
        return;
      }

      if (this.mode === 'crashed' || this.mode === 'landed') {
        if (events.restart) this.startMission(this.selectedMission);
        if (events.title) { this.mode = 'title'; this.startAttract(); }
        if (events.next && this.mode === 'landed') {
          this.startMission((this.selectedMission + 1) % MISSIONS.length);
        }
        return;
      }

      // Flying.
      if (events.pause) { this.mode = 'paused'; return; }
      if (events.gear) {
        this.plane.gearDown = !this.plane.gearDown;
        this.flash = this.plane.gearDown ? 'GEAR DOWN' : 'GEAR UP';
        this.flashUntil = this.time + 1.4;
        audio.click();
      }

      const prevY = this.plane.y;
      stepFlight(this.plane, ctl, this.mission, dt);
      const p = this.plane;
      this.vs = (p.y - prevY) / Math.max(dt, 0.001);
      p.vs = this.vs;
      this.time += dt;
      this.groundBelow = p.y - terrainHeight(p.x, p.z);

      // Ring passes: crossing a ring's plane scores it.
      for (const ring of this.rings) {
        if (ring.passed) continue;
        if (p.z >= ring.z && p.z - p.speed * dt < ring.z + 30) {
          const dx = p.x - ring.x;
          const dy = p.y - ring.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < WORLD.ringRadius) {
            ring.passed = true;
            const center = dist < WORLD.ringRadius * 0.5;
            const pts = SCORE.ring + (center ? SCORE.ringCenter : 0);
            this.score += pts;
            this.flash = center ? `DEAD CENTRE +${pts}` : `RING +${pts}`;
            this.flashUntil = this.time + 1.6;
            audio.ring(center);
          }
        }
      }
      // Next ring is the first unpassed one.
      this.nextIndex = this.rings.findIndex((r) => !r.passed);
      if (this.nextIndex === -1) this.nextIndex = this.rings.length - 1;

      if (p.crashed) {
        this.mode = 'crashed';
        audio.crash();
        return;
      }
      if (p.landed) {
        this.mode = 'landed';
        this.score += SCORE.landing
          + Math.round(p.fuel * SCORE.fuelPerUnit)
          + Math.max(0, Math.round((this.mission.parTime - this.time) * SCORE.timePerSecond));
        audio.land();
      }
    },

    /** HUD-ready view of the state. */
    view() {
      return {
        mode: this.mode,
        mission: this.mission,
        palette: this.palette,
        plane: this.plane,
        rings: this.rings,
        scenery: this.scenery,
        nextIndex: this.nextIndex,
        score: this.score,
        time: this.time,
        flash: this.flash,
        flashUntil: this.flashUntil,
        groundBelow: this.groundBelow,
        selectedMission: this.selectedMission,
      };
    },
  };
  game.startAttract();
  return game;
}

export { courseX };
