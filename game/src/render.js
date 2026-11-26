// render.js — the chase view: sky, ridges, valley ribbon, runway, rings,
// trees and the plane itself. Pseudo-3D projection, pure Canvas 2D.

import { WORLD } from './config.js';
import { courseX, terrainHeight, groundColor, runwayAt } from './terrain.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const W = () => canvas.width;
  const H = () => canvas.height;

  function project(wx, wy, wz, cam, scale, horizonY) {
    const dx = wx - cam.x;
    const dz = wz - cam.z;
    const fwd = dx * Math.sin(cam.heading) + dz * Math.cos(cam.heading);
    if (fwd < 10) return null;
    const side = dx * Math.cos(cam.heading) - dz * Math.sin(cam.heading);
    return {
      x: W() / 2 + (scale * side) / fwd,
      y: horizonY - (scale * (wy - cam.y)) / fwd,
      fwd,
      scale: scale / fwd,
    };
  }

  function drawSky(palette, heading, pitch, t) {
    const w = W(), h = H();
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    g.addColorStop(0, palette.skyTop);
    g.addColorStop(0.62, palette.skyMid);
    g.addColorStop(1, palette.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.62);

    // Sun, fixed in the sky ahead-right of the course.
    const sunAngle = 0.55 - heading;
    const sunX = w / 2 + sunAngle * w * 0.9;
    const sunY = h * 0.16 - pitch * h * 0.3;
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
    glow.addColorStop(0, palette.sunGlow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();

    // Drifting clouds, placed by sky angle so they slide with the heading.
    ctx.fillStyle = palette.cloud;
    for (let i = 0; i < 9; i++) {
      const angle = i * 0.83 + 0.4 - heading + t * 0.002 * (i % 3 + 1) * 0.2;
      const cx = w / 2 + angle * w * 1.05;
      if (cx < -160 || cx > w + 160) continue;
      const cy = 46 + (i % 4) * 42 + Math.sin(i * 2.1) * 12;
      const s = 34 + (i % 3) * 18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, s, s * 0.36, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + s * 0.6, cy + 5, s * 0.7, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function ridgeHeightAt(sx, off, seed, amp) {
    return 40
      + amp * (0.55 + 0.45 * Math.sin(sx * 0.004 + off + seed))
      + amp * 0.35 * Math.sin(sx * 0.011 + off * 1.7 + seed * 2.3)
      + amp * 0.18 * Math.sin(sx * 0.027 + seed * 5.1);
  }

  function drawRidges(palette, heading, horizonY, seed) {
    const w = W();
    const layers = [
      { color: palette.farRidge, par: 260, amp: 1.0, off: seed * 0.7 },
      { color: palette.nearRidge, par: 560, amp: 0.62, off: seed * 1.9 + 3 },
    ];
    for (const layer of layers) {
      const off = -heading * layer.par + layer.off;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(-4, horizonY + 2);
      for (let x = -4; x <= w + 4; x += 14) {
        ctx.lineTo(x, horizonY - ridgeHeightAt(x, off, seed, 120 * layer.amp));
      }
      ctx.lineTo(w + 4, horizonY + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawGround(palette, cam, scale, horizonY, segFrom, segTo) {
    const seg = WORLD.segmentLength;
    const strips = 10; // lateral strips: the ribbon follows the valley's cross-section
    const hw = WORLD.groundHalfWidth;
    const stripW = (hw * 2) / strips;
    for (let i = segTo - 1; i >= segFrom; i--) {
      const zNear = cam.z + i * seg;
      const zFar = zNear + seg;
      if (zFar < cam.z + 12) continue;
      const cxN = courseX(zNear);
      const cxF = courseX(zFar);
      for (let s = 0; s < strips; s++) {
        const x0N = cxN - hw + s * stripW;
        const x1N = x0N + stripW;
        const x0F = cxF - hw + s * stripW;
        const x1F = x0F + stripW;
        const pLN = project(x0N, terrainHeight(x0N, zNear), zNear, cam, scale, horizonY);
        const pRN = project(x1N, terrainHeight(x1N, zNear), zNear, cam, scale, horizonY);
        const pLF = project(x0F, terrainHeight(x0F, zFar), zFar, cam, scale, horizonY);
        const pRF = project(x1F, terrainHeight(x1F, zFar), zFar, cam, scale, horizonY);
        if (!pLN || !pRN || !pLF || !pRF) continue;
        const midH = terrainHeight((x0N + x1N) / 2, zNear);
        ctx.fillStyle = groundColor(palette, midH);
        ctx.beginPath();
        ctx.moveTo(pLN.x, pLN.y);
        ctx.lineTo(pRN.x, pRN.y);
        ctx.lineTo(pRF.x, pRF.y);
        ctx.lineTo(pLF.x, pLF.y);
        ctx.closePath();
        ctx.fill();
      }

      // Runway strip: asphalt with a dashed centreline and edge lines.
      if (runwayAt(cxN, zNear) || runwayAt(cxN, zFar)) {
        const rw = 46;
        const qLN = project(cxN - rw, 0.4, zNear, cam, scale, horizonY);
        const qRN = project(cxN + rw, 0.4, zNear, cam, scale, horizonY);
        const qLF = project(cxF - rw, 0.4, zFar, cam, scale, horizonY);
        const qRF = project(cxF + rw, 0.4, zFar, cam, scale, horizonY);
        if (qLN && qRN && qLF && qRF) {
          ctx.fillStyle = palette.runway;
          ctx.beginPath();
          ctx.moveTo(qLN.x, qLN.y);
          ctx.lineTo(qRN.x, qRN.y);
          ctx.lineTo(qRF.x, qRF.y);
          ctx.lineTo(qLF.x, qLF.y);
          ctx.closePath();
          ctx.fill();
          // Centreline dash on alternate segments.
          if (i % 2 === 0) {
            const d = 3;
            const cLN = project(cxN - d, 0.7, zNear, cam, scale, horizonY);
            const cRN = project(cxN + d, 0.7, zNear, cam, scale, horizonY);
            const cLF = project(cxF - d, 0.7, zFar, cam, scale, horizonY);
            const cRF = project(cxF + d, 0.7, zFar, cam, scale, horizonY);
            if (cLN && cRN && cLF && cRF) {
              ctx.fillStyle = palette.runwayLine;
              ctx.beginPath();
              ctx.moveTo(cLN.x, cLN.y);
              ctx.lineTo(cRN.x, cRN.y);
              ctx.lineTo(cRF.x, cRF.y);
              ctx.lineTo(cLF.x, cLF.y);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }
  }

  function drawScenery(palette, items, cam, scale, horizonY) {
    const visible = [];
    for (const it of items) {
      const dz = it.z - cam.z;
      if (dz < 12 || dz > WORLD.drawDistance * WORLD.segmentLength) continue;
      const p = project(it.x, it.y, it.z, cam, scale, horizonY);
      if (!p) continue;
      if (p.x < -120 || p.x > W() + 120 || p.y > H() + 40) continue;
      visible.push({ it, p });
    }
    visible.sort((a, b) => b.it.z - a.it.z);
    for (const { it, p } of visible) {
      const s = p.scale * it.size;
      if (s < 1.5) continue;
      if (it.kind === 'pine') {
        ctx.fillStyle = '#2d5a2e';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 2.2);
        ctx.lineTo(p.x - s * 0.85, p.y);
        ctx.lineTo(p.x + s * 0.85, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3f7a35';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 2.9);
        ctx.lineTo(p.x - s * 0.6, p.y - s * 0.9);
        ctx.lineTo(p.x + s * 0.6, p.y - s * 0.9);
        ctx.closePath();
        ctx.fill();
      } else if (it.kind === 'rock') {
        ctx.fillStyle = '#7d7468';
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.8, p.y);
        ctx.lineTo(p.x - s * 0.3, p.y - s * 1.1);
        ctx.lineTo(p.x + s * 0.5, p.y - s * 0.9);
        ctx.lineTo(p.x + s * 0.9, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (it.kind === 'lake') {
        ctx.fillStyle = palette.water;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x - s * 0.2, p.y - s * 0.05, s * 0.55, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawRings(palette, rings, cam, scale, horizonY, nextIndex) {
    const sorted = rings
      .filter((r) => r.z - cam.z > 12 && r.z - cam.z < WORLD.drawDistance * WORLD.segmentLength)
      .sort((a, b) => b.z - a.z);
    for (const ring of sorted) {
      const p = project(ring.x, ring.y, ring.z, cam, scale, horizonY);
      if (!p) continue;
      const r = p.scale * WORLD.ringRadius;
      if (r < 2) continue;
      const isNext = ring.index === nextIndex;
      ctx.save();
      ctx.shadowColor = isNext ? palette.ring : palette.ringPass;
      ctx.shadowBlur = isNext ? 18 : 6;
      ctx.strokeStyle = ring.passed ? palette.ringPass : palette.ring;
      ctx.globalAlpha = ring.passed ? 0.45 : (isNext ? 1 : 0.85);
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (isNext && r > 26) {
        ctx.fillStyle = palette.ring;
        ctx.font = `bold ${Math.max(12, Math.min(20, r * 0.28))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`RING ${ring.index + 1}`, p.x, p.y - r - 10);
      }
    }
  }

  function drawPlane(plane, t) {
    const w = W(), h = H();
    const lateral = (plane.x - courseX(plane.z)) * 0.045;
    const px = w / 2 + lateral;
    const py = h * 0.74 + plane.pitch * h * 0.12 + Math.sin(t * 0.09) * 1.5;
    const s = Math.min(w, h) / 800; // plane scale with window
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-plane.roll * 0.85);
    ctx.scale(s, s);

    // Soft shadow of the plane on the ground is skipped: the chase camera
    // looks slightly down, so the fuselage reads against the valley.
    // Wings (main + tailplane).
    ctx.fillStyle = '#c65a1e';
    ctx.strokeStyle = '#7a2f0e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-150, 6);
    ctx.quadraticCurveTo(-120, -14, -30, -8);
    ctx.lineTo(30, -8);
    ctx.quadraticCurveTo(120, -14, 150, 6);
    ctx.lineTo(120, 14);
    ctx.quadraticCurveTo(40, 8, 0, 10);
    ctx.quadraticCurveTo(-40, 8, -120, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Wing roundels.
    ctx.fillStyle = '#f7e8c8';
    ctx.beginPath(); ctx.arc(-92, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(92, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c65a1e';
    ctx.beginPath(); ctx.arc(-92, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(92, 0, 5, 0, Math.PI * 2); ctx.fill();
    // Tailplane.
    ctx.fillStyle = '#a34a18';
    ctx.beginPath();
    ctx.moveTo(-58, -58);
    ctx.lineTo(58, -58);
    ctx.lineTo(46, -44);
    ctx.lineTo(-46, -44);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    ctx.fillStyle = '#e0702a';
    ctx.strokeStyle = '#7a2f0e';
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.quadraticCurveTo(20, -70, 22, -30);
    ctx.lineTo(22, 34);
    ctx.quadraticCurveTo(20, 52, 0, 54);
    ctx.quadraticCurveTo(-20, 52, -22, 34);
    ctx.lineTo(-22, -30);
    ctx.quadraticCurveTo(-20, -70, 0, -86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Canopy.
    ctx.fillStyle = '#1d3a4d';
    ctx.beginPath();
    ctx.ellipse(0, -46, 12, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-4, -52, 4, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Vertical fin.
    ctx.fillStyle = '#a34a18';
    ctx.beginPath();
    ctx.moveTo(0, -84);
    ctx.lineTo(0, -112);
    ctx.lineTo(14, -84);
    ctx.closePath();
    ctx.fill();
    // Exhaust glow when the throttle is open.
    if (plane.throttle > 0.1 && !plane.crashed) {
      ctx.fillStyle = `rgba(255, 190, 80, ${0.25 + plane.throttle * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(0, 58, 8, 10 + plane.throttle * 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Navigation lights: red port, green starboard, lit.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath(); ctx.arc(-150, 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2fd94f';
    ctx.beginPath(); ctx.arc(150, 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** Render one frame of the world (no HUD, no overlays). */
  function renderWorld(view) {
    const { plane, palette, rings, scenery, nextIndex, time } = view;
    const w = W(), h = H();
    const scale = h * 0.78;
    const horizonY = h * 0.44 - plane.pitch * h * 0.55;
    // Base fill: ground colour below the horizon, so a low camera never
    // shows the page background where the nearest strips end.
    ctx.fillStyle = palette.valley;
    ctx.fillRect(0, 0, w, h);
    const cam = {
      x: plane.x,
      y: plane.y + WORLD.cameraHeight,
      z: plane.z,
      heading: plane.heading,
      pitch: plane.pitch,
      roll: plane.roll,
    };
    ctx.save();
    // Roll the whole world a touch; the plane and HUD stay level.
    ctx.translate(w / 2, horizonY);
    ctx.rotate(-plane.roll * 0.22);
    ctx.translate(-w / 2, -horizonY);
    drawSky(palette, plane.heading, plane.pitch, time);
    drawRidges(palette, plane.heading, horizonY, view.mission.seed);
    drawGround(palette, cam, scale, horizonY, 0, WORLD.drawDistance);
    drawScenery(palette, scenery, cam, scale, horizonY);
    drawRings(palette, rings, cam, scale, horizonY, nextIndex);
    ctx.restore();
    drawPlane(plane, time);
    return { horizonY, scale };
  }

  return { renderWorld, project };
}
