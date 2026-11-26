// hud.js — the instruments and the screens: HUD tapes, compass, artificial
// horizon, fuel and throttle, plus title / pause / crash / landing panels.
// Everything is drawn on the same canvas, in lit amber and cyan on dark glass.

import { GAME_TITLE, GAME_TAGLINE, MISSIONS, SCORE } from './config.js';
import { knots, feet, headingDeg } from './flight.js';

export function createHud(canvas) {
  const ctx = canvas.getContext('2d');
  const W = () => canvas.width;
  const H = () => canvas.height;

  function panel(x, y, w, h, alpha = 0.55) {
    ctx.fillStyle = `rgba(10, 16, 24, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function label(text, x, y, size, color, align = 'left') {
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = color || '#cfe8ff';
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }

  function drawCompass(heading, y) {
    const w = W();
    const cx = w / 2;
    const deg = headingDeg(heading);
    panel(cx - 170, y - 18, 340, 34, 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cx - 170, y - 18, 340, 34, 8);
    ctx.clip();
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let d = -60; d <= 60; d += 15) {
      const a = ((deg + d) % 360 + 360) % 360;
      const x = cx + d * 2.4;
      const card = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[a];
      ctx.fillStyle = card ? '#ffd23e' : '#cfe8ff';
      ctx.fillText(card || String(a), x, y + 5);
      ctx.fillRect(x - 0.5, y + 10, 1, 5);
    }
    ctx.restore();
    // Centre caret + readout.
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.moveTo(cx - 6, y - 18);
    ctx.lineTo(cx + 6, y - 18);
    ctx.lineTo(cx, y - 10);
    ctx.closePath();
    ctx.fill();
    label(`${String(deg).padStart(3, '0')}°`, cx, y + 34, 13, '#ffb02e', 'center');
  }

  function drawTape(x, y, h, value, unit, step, fmt, min = 0) {
    panel(x - 52, y, 104, h, 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x - 52, y, 104, h, 8);
    ctx.clip();
    const mid = y + h / 2;
    const pxPer = h / 6; // pixels between neighbouring tick values
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let d = -3; d <= 3; d++) {
      const v = Math.round((value + d * step) / step) * step;
      if (v < min) continue;
      const yy = mid - ((v - value) / step) * pxPer;
      if (yy < y + 8 || yy > y + h - 8) continue;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillText(fmt(v), x - 8, yy + 4);
      ctx.fillRect(x - 4, yy, 6, 1);
    }
    ctx.restore();
    // Centre readout.
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.moveTo(x - 52, mid - 11);
    ctx.lineTo(x - 44, mid);
    ctx.lineTo(x - 52, mid + 11);
    ctx.closePath();
    ctx.fill();
    label(fmt(value), x + 44, mid + 5, 17, '#ffd23e', 'right');
    label(unit, x + 44, mid + 24, 11, '#9fc3dd', 'right');
  }

  function drawArtificialHorizon(plane, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.roll);
    const pitchPx = plane.pitch * r * 1.4;
    ctx.fillStyle = '#3f7fc4';
    ctx.fillRect(-r - 2, -r - 2 + pitchPx, r * 2 + 4, r + 2 - pitchPx);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-r - 2, pitchPx, r * 2 + 4, r + 2);
    ctx.strokeStyle = '#f2f2e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchPx);
    ctx.lineTo(r, pitchPx);
    ctx.stroke();
    ctx.restore();
    // Fixed aircraft symbol.
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
    label('ATTITUDE', cx, cy + r + 16, 11, '#9fc3dd', 'center');
  }

  function drawBar(x, y, w, h, frac, color, bg) {
    ctx.fillStyle = bg || 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, w * Math.max(0, Math.min(1, frac))), h, 4);
    ctx.fill();
  }

  /** The in-flight HUD. `s` is the game state object. */
  function drawHud(s) {
    const w = W(), h = H();
    const plane = s.plane;
    const mission = s.mission;

    // Top strip: mission, score, timer, fuel.
    panel(12, 10, w - 24, 44, 0.5);
    label(mission.name.toUpperCase(), 26, 38, 17, '#ffd23e');
    label(`SCORE ${s.score}`, w / 2, 38, 17, '#ffffff', 'center');
    const mins = Math.floor(s.time / 60);
    const secs = Math.floor(s.time % 60);
    label(`${mins}:${String(secs).padStart(2, '0')}`, w - 190, 38, 17, '#cfe8ff', 'right');
    const fuelFrac = plane.fuel / mission.fuel;
    drawBar(w - 176, 26, 120, 12, fuelFrac, fuelFrac < 0.25 ? '#ff5a4a' : '#58e08a');
    label('FUEL', w - 182, 38, 11, '#9fc3dd', 'right');

    drawCompass(plane.heading, 78);

    // Rings progress.
    const done = s.rings.filter((r) => r.passed).length;
    panel(12, 64, 300, 30, 0.5);
    label(`RINGS ${done}/${s.rings.length}`, 24, 85, 15, '#cfe8ff');
    for (let i = 0; i < s.rings.length; i++) {
      ctx.fillStyle = s.rings[i].passed ? '#58e08a' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(150 + i * 9, 79, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speed tape (left) and altitude tape (right).
    drawTape(70, h * 0.28, 220, knots(plane.speed), 'KT', 20, (v) => String(v));
    drawTape(w - 70, h * 0.28, 220, Math.max(0, feet(plane.y)), 'FT', 200, (v) => String(v));

    // Artificial horizon, bottom-left.
    drawArtificialHorizon(plane, 92, h - 92, 62);

    // Throttle + gear, bottom-right.
    panel(w - 196, h - 108, 184, 96, 0.5);
    label('THROTTLE', w - 182, h - 82, 11, '#9fc3dd');
    drawBar(w - 182, h - 74, 156, 12, plane.throttle, '#ffb02e');
    label(`${Math.round(plane.throttle * 100)}%`, w - 26, h - 62, 13, '#ffd23e', 'right');
    label(`GEAR ${plane.gearDown ? 'DOWN' : 'UP'}`, w - 182, h - 40, 13,
      plane.gearDown ? '#58e08a' : '#ff5a4a');
    label(`FLAPS —  V/S ${plane.vs >= 0 ? '+' : ''}${Math.round(plane.vs)} m/s`,
      w - 182, h - 22, 11, '#9fc3dd');

    // Warnings, centre-top below the compass.
    const warnings = [];
    if (plane.fuel < mission.fuel * 0.2 && plane.fuel > 0) warnings.push('LOW FUEL');
    if (plane.fuel <= 0) warnings.push('FUEL EMPTY — GLIDING');
    if (!plane.onGround && plane.speed < 30) warnings.push('STALL — NOSE DOWN, THROTTLE UP');
    const ground = s.groundBelow;
    if (!plane.onGround && ground < 45 && plane.vs < -4) warnings.push('PULL UP');
    if (warnings.length) {
      const blink = Math.floor(s.time * 3) % 2 === 0;
      if (blink) {
        label(warnings[0], w / 2, 128, 20, '#ff5a4a', 'center');
      }
    }

    // Transient centre message (e.g. "RING +100").
    if (s.flash && s.flashUntil > s.time) {
      ctx.globalAlpha = Math.min(1, (s.flashUntil - s.time) * 2);
      label(s.flash, w / 2, h * 0.3, 34, '#ffd23e', 'center');
      ctx.globalAlpha = 1;
    }

    // Early-flight controls hint.
    if (s.time < 9 && s.mode === 'flying') {
      label('↑↓ pitch · ←→ bank · SHIFT throttle · G gear · P pause',
        w / 2, h - 16, 13, 'rgba(207,232,255,0.8)', 'center');
    }
  }

  function drawTitle(s) {
    const w = W(), h = H();
    ctx.fillStyle = 'rgba(8, 14, 22, 0.45)';
    ctx.fillRect(0, 0, w, h);
    const cy = h * 0.2;
    label(GAME_TITLE, w / 2, cy, 64, '#ffd23e', 'center');
    label(GAME_TAGLINE, w / 2, cy + 40, 19, '#eaf4ff', 'center');

    const cardW = 300, cardH = 150, gap = 24;
    const total = cardW * 3 + gap * 2;
    const x0 = (w - total) / 2;
    const y0 = h * 0.42;
    MISSIONS.forEach((m, i) => {
      const x = x0 + i * (cardW + gap);
      const sel = s.selectedMission === i;
      panel(x, y0, cardW, cardH, sel ? 0.8 : 0.55);
      if (sel) {
        ctx.strokeStyle = '#ffd23e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y0, cardW, cardH, 8);
        ctx.stroke();
      }
      label(`${i + 1}. ${m.name}`, x + 18, y0 + 32, 19, sel ? '#ffd23e' : '#eaf4ff');
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = '#cfe8ff';
      ctx.textAlign = 'left';
      wrapText(m.blurb, x + 18, y0 + 58, cardW - 36, 19);
      label(`Rings ${m.rings} · Fuel ${m.fuel} · Par ${m.parTime}s`,
        x + 18, y0 + cardH - 18, 13, '#9fc3dd');
    });

    label('CLICK a mission or press 1 / 2 / 3, then ENTER or CLICK to fly',
      w / 2, y0 + cardH + 44, 17, '#ffffff', 'center');
    label('Fly the rings, then land on the far runway. Gear down (G) to land.',
      w / 2, y0 + cardH + 70, 14, '#cfe8ff', 'center');
    label('Arrows / WASD — fly · Mouse — steer · Wheel / Shift / Ctrl — throttle · P — pause · M — sound',
      w / 2, h - 28, 13, '#9fc3dd', 'center');
  }

  function wrapText(text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawCenterPanel(title, titleColor, lines, foot) {
    const w = W(), h = H();
    ctx.fillStyle = 'rgba(8, 12, 18, 0.62)';
    ctx.fillRect(0, 0, w, h);
    const pw = 520, ph = 110 + lines.length * 30 + 52;
    const x = (w - pw) / 2, y = (h - ph) / 2;
    panel(x, y, pw, ph, 0.92);
    label(title, w / 2, y + 52, 40, titleColor, 'center');
    lines.forEach((ln, i) => {
      label(ln, w / 2, y + 96 + i * 30, 17, '#eaf4ff', 'center');
    });
    label(foot, w / 2, y + ph - 22, 14, '#9fc3dd', 'center');
  }

  function drawPaused() {
    drawCenterPanel('PAUSED', '#cfe8ff', ['Take a breath. The ridge will wait.'],
      'P — resume · R — restart · T — title');
  }

  function drawCrashed(s) {
    drawCenterPanel('CRASHED', '#ff5a4a',
      [s.plane.crashReason, `Score ${s.score} · Rings ${s.rings.filter((r) => r.passed).length}/${s.rings.length}`],
      'R — fly again · T — title');
  }

  function drawLanded(s) {
    const fuelBonus = Math.round(s.plane.fuel * SCORE.fuelPerUnit);
    const timeBonus = Math.max(0, Math.round((s.mission.parTime - s.time) * SCORE.timePerSecond));
    drawCenterPanel('MISSION COMPLETE', '#58e08a',
      [`Landed clean at Ember Ridge Field.`,
       `Landing +${SCORE.landing} · Fuel bonus +${fuelBonus} · Time bonus +${timeBonus}`,
       `Final score ${s.score}`],
      'R — fly again · N — next mission · T — title');
  }

  return { drawHud, drawTitle, drawPaused, drawCrashed, drawLanded };
}
