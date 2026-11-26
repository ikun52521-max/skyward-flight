// flight.js — the flight model: throttle, pitch, bank, lift, stall, wind.
// Arcade-tuned but honest: speed, lift and turn rate all depend on each other,
// so flying well means managing throttle and bank, not just holding a key.

import { WORLD, MISSIONS } from './config.js';
import { terrainHeight, courseX, runwayAt } from './terrain.js';

export function newPlane(mission) {
  return {
    // Position over the course: x lateral, y altitude (m), z along course (m).
    x: courseX(120),
    y: 0, // sitting on the start runway
    z: 120,
    heading: 0, // radians, 0 = along the course
    pitch: 0,
    roll: 0,
    speed: 0, // m/s
    throttle: 0,
    fuel: mission.fuel,
    gearDown: true,
    onGround: true,
    vs: 0,
    crashed: false,
    landed: false,
    crashReason: '',
    windGust: 0,
  };
}

/** One physics step. `ctl` is { pitch, roll, throttle } in [-1, 1] (throttle 0..1). */
export function stepFlight(plane, ctl, mission, dt) {
  const p = plane;
  if (p.crashed || p.landed) return;

  // Throttle: fuel feeds the engine; dry tanks mean a glide.
  p.throttle = Math.max(0, Math.min(1, ctl.throttle));
  if (p.fuel <= 0) p.throttle = 0;
  p.fuel = Math.max(0, p.fuel - (0.22 + p.throttle * 0.9) * dt);

  // Gusts build and fade; storm missions shake the wing.
  const gustTarget = mission.wind * (Math.sin(performance.now() * 0.00021) * 0.7
    + Math.sin(performance.now() * 0.00053 + 2) * 0.3);
  p.windGust += (gustTarget - p.windGust) * Math.min(1, dt * 0.8);

  // Pitch and roll ease toward the pilot's input; heavy at low speed.
  const authority = Math.min(1, Math.max(0.25, p.speed / WORLD.stallSpeed));
  const pitchRate = 0.85 * authority;
  const rollRate = 1.6 * authority;
  p.pitch += (ctl.pitch * WORLD.maxPitch - p.pitch) * Math.min(1, pitchRate * dt);
  p.roll += (ctl.roll * WORLD.maxRoll - p.roll) * Math.min(1, rollRate * dt);

  // Speed chases the throttle, with drag; a dive trades height for speed.
  const targetSpeed = p.throttle * WORLD.maxSpeed;
  const drag = p.onGround ? 2.2 : 0.55;
  p.speed += (targetSpeed - p.speed) * Math.min(1, drag * dt);
  p.speed += -Math.sin(p.pitch) * WORLD.gravity * 0.55 * dt;
  p.speed = Math.max(0, p.speed);

  // Bank turns the nose; gusts push the wing around a little.
  const turnRate = (Math.sin(p.roll) * WORLD.gravity) / Math.max(18, p.speed);
  p.heading += (turnRate + p.windGust * 0.012) * dt;

  // Move along the heading.
  const forward = Math.max(0, p.speed);
  p.z += Math.cos(p.heading) * forward * dt;
  p.x += Math.sin(p.heading) * forward * dt;
  // Wind drift, stronger the higher you fly.
  p.x += p.windGust * 6 * Math.min(1, p.y / 200) * dt;

  // Lift: climb with pitch while the wing flies; stall and sink below it.
  const stalled = p.speed < WORLD.stallSpeed && !p.onGround;
  const climb = stalled
    ? -14 * (1 - p.speed / WORLD.stallSpeed)
    : Math.sin(p.pitch) * forward * 0.9;
  p.y += climb * dt;

  // Ground contact.
  const ground = terrainHeight(p.x, p.z);
  if (p.onGround) {
    // Rolling: the wheels hold the plane on the strip until rotation speed.
    p.y = ground;
    if (p.speed > 34 && p.pitch > 0.06) {
      p.onGround = false;
      p.y = ground + 1;
    }
  } else if (p.y <= ground + 0.5) {
    p.y = ground;
    const descent = -climb;
    const onRunway = runwayAt(p.x, p.z);
    const gentle = descent < 6 && Math.abs(p.roll) < 0.3 && p.speed < 58;
    if (onRunway && gentle && p.gearDown) {
      landPlane(p);
    } else if (onRunway && gentle && !p.gearDown) {
      crashPlane(p, 'Belly landing — the gear was up.');
    } else if (p.speed < 12 && descent < 4) {
      // A slow, soft arrival off the strip: a rough field landing.
      crashPlane(p, 'Forced landing in the rough — short of the runway.');
    } else {
      crashPlane(p, onRunway ? 'Too fast for the runway.' : 'Terrain impact.');
    }
  }

  // Past the far end with no runway left: the valley ends.
  if (p.z > WORLD.courseLength + 400) {
    crashPlane(p, 'Flew past the valley — out of map.');
  }
}

export function landPlane(p) {
  p.landed = true;
  p.onGround = true;
  p.speed = Math.max(0, p.speed - 4);
  p.pitch = 0;
  p.roll = 0;
}

export function crashPlane(p, reason) {
  p.crashed = true;
  p.crashReason = reason;
  p.speed = 0;
}

/** Display conversions. */
export function knots(speed) { return Math.round(speed * 1.944); }
export function feet(alt) { return Math.round(alt * 3.281); }
export function headingDeg(heading) {
  return Math.round(((heading * 180 / Math.PI) % 360 + 360) % 360);
}

export { MISSIONS };
