// main.js — bootstrap: canvas, loop, input wiring and screenshot scenes.
// ?scene=title | fly | landing | crash stages a fixed moment of the game
// so its screenshots are real renders of this code, nothing composited.

import { WORLD, MISSIONS } from './config.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { courseX, terrainHeight } from './terrain.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}

const game = createGame();
const renderer = createRenderer(canvas);
const hud = createHud(canvas);
const audio = createAudio();
const input = createInput(canvas);
input.attach();
fitCanvas();
window.addEventListener('resize', fitCanvas);

/** Stage a fixed scene for screenshots. Returns true when a scene was set. */
function stageScene() {
  const scene = new URLSearchParams(window.location.search).get('scene');
  if (!scene) return false;
  const plane = game.plane;
  if (scene === 'title') {
    game.selectedMission = 0;
    game.startAttract();
    game.plane.z = 3400;
    game.plane.y = 170;
    game.plane.speed = 62;
    return true;
  }
  if (scene === 'fly') {
    game.startMission(0);
    const p = game.plane;
    p.z = 5200;
    p.x = courseX(5200) - 40;
    p.y = terrainHeight(p.x, 5200) + 130;
    p.speed = 74;
    p.throttle = 0.78;
    p.pitch = 0.05;
    p.roll = -0.18;
    p.onGround = false;
    game.time = 47;
    game.score = 300;
    game.rings[0].passed = true;
    game.rings[1].passed = true;
    game.rings[2].passed = true;
    game.nextIndex = 3;
    game.flash = 'RING +100';
    game.flashUntil = 9999;
    return true;
  }
  if (scene === 'landing') {
    game.startMission(0);
    const p = game.plane;
    const end = WORLD.courseLength - WORLD.runwayLength;
    p.z = end - 650;
    p.x = courseX(p.z);
    p.y = terrainHeight(p.x, p.z) + 55;
    p.speed = 48;
    p.throttle = 0.38;
    p.pitch = -0.05;
    p.roll = 0.02;
    p.gearDown = true;
    p.onGround = false;
    game.time = 132;
    game.score = 1150;
    for (const r of game.rings) r.passed = true;
    game.nextIndex = game.rings.length - 1;
    game.flash = 'FINAL — GEAR DOWN';
    game.flashUntil = 9999;
    return true;
  }
  if (scene === 'crash') {
    game.startMission(1);
    const p = game.plane;
    p.z = 6100;
    p.x = courseX(6100) + 320;
    p.y = terrainHeight(p.x, 6100);
    p.speed = 0;
    p.crashed = true;
    p.crashReason = 'Terrain impact.';
    game.mode = 'crashed';
    game.time = 88;
    game.score = 450;
    game.rings[0].passed = true;
    game.rings[1].passed = true;
    return true;
  }
  return false;
}

const staged = stageScene();
let last = performance.now();
let elapsed = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;

  // Edge-triggered actions from keys and mouse.
  const events = {
    start: input.wasPressed('Enter') || input.wasPressed('mouse'),
    pause: input.wasPressed('p') || input.wasPressed('P'),
    restart: input.wasPressed('r') || input.wasPressed('R'),
    title: input.wasPressed('t') || input.wasPressed('T'),
    next: input.wasPressed('n') || input.wasPressed('N'),
    gear: input.wasPressed('g') || input.wasPressed('G'),
    mission: null,
  };
  for (let i = 0; i < MISSIONS.length; i++) {
    if (input.wasPressed(String(i + 1))) events.mission = i;
  }
  if (input.wasPressed('m') || input.wasPressed('M')) audio.toggleMute();
  // Clicking a mission card on the title screen selects it.
  if (game.mode === 'title' && events.start) {
    const cardW = 300, gap = 24;
    const total = cardW * 3 + gap * 2;
    const x0 = (window.innerWidth - total) / 2;
    const y0 = window.innerHeight * 0.42;
    const mx = input.mouseX * window.innerWidth;
    const my = input.mouseY * window.innerHeight;
    if (my >= y0 && my <= y0 + 150) {
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (cardW + gap);
        if (mx >= x && mx <= x + cardW) {
          events.mission = i;
          events.start = false; // select only; a second click flies
          break;
        }
      }
    }
  }

  const ctl = input.control(game.plane ? game.plane.throttle : 0);
  // A staged scene (?scene=...) is a frozen moment for screenshots:
  // render it, do not simulate it.
  if (!staged) {
    game.update(dt, ctl, events, audio);
  }
  input.clearPressed();

  const view = game.view();
  if (!staged) view.time = elapsed; // staged scenes keep their scripted clock
  const { horizonY } = renderer.renderWorld(view);
  if (view.mode === 'title') hud.drawTitle(view);
  else if (view.mode === 'paused') { hud.drawHud(view); hud.drawPaused(); }
  else if (view.mode === 'crashed') { hud.drawHud(view); hud.drawCrashed(view); }
  else if (view.mode === 'landed') { hud.drawHud(view); hud.drawLanded(view); }
  else hud.drawHud(view);

  if (audio.started) {
    audio.update(game.plane.throttle, game.plane.speed, !game.plane.onGround);
  }
  requestAnimationFrame(frame);
}

// One synchronous frame at load so a screenshot never catches a blank page.
requestAnimationFrame(frame);

// First user gesture unlocks audio.
window.addEventListener('pointerdown', () => audio.start(), { once: true });
window.addEventListener('keydown', () => audio.start(), { once: true });
