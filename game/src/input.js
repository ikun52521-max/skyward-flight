// input.js — keyboard and mouse. The plane answers to both:
// arrows / WASD fly it, Shift and Ctrl work the throttle, the mouse steers
// by position and its wheel works the throttle. P pauses, R restarts.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0.5, // 0..1 across the canvas
    mouseY: 0.5,
    mouseActive: false,
    wheelDelta: 0,
    pressed: new Set(), // keys pressed since last poll (edge-triggered)

    attach() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }
        if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
        this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      });
      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      });
      window.addEventListener('blur', () => this.keys.clear());
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouseX = (e.clientX - r.left) / r.width;
        this.mouseY = (e.clientY - r.top) / r.height;
        this.mouseActive = true;
      });
      canvas.addEventListener('mousedown', () => { this.pressed.add('mouse'); });
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.wheelDelta += e.deltaY;
      }, { passive: false });
      canvas.addEventListener('mouseleave', () => { this.mouseActive = false; });
    },

    down(...names) {
      return names.some((n) => this.keys.has(n));
    },

    /** True once for a key pressed since the last call; then clears it. */
    wasPressed(name) {
      if (this.pressed.has(name)) {
        this.pressed.delete(name);
        return true;
      }
      return false;
    },

    clearPressed() { this.pressed.clear(); },

    takeWheel() {
      const d = this.wheelDelta;
      this.wheelDelta = 0;
      return d;
    },

    /** Control vector for the flight model, from keys and mouse together. */
    control(throttle) {
      let pitch = 0;
      let roll = 0;
      if (this.down('ArrowUp', 'w')) pitch += 1;
      if (this.down('ArrowDown', 's')) pitch -= 1;
      if (this.down('ArrowLeft', 'a')) roll -= 1;
      if (this.down('ArrowRight', 'd')) roll += 1;

      // Mouse steering: hold the mouse off-centre to bank that way,
      // and off the vertical middle to pitch gently.
      if (this.mouseActive) {
        const steer = (this.mouseX - 0.5) * 2;
        if (Math.abs(steer) > 0.12) roll += Math.max(-1, Math.min(1, steer));
        const pitchMouse = (0.5 - this.mouseY) * 2;
        if (Math.abs(pitchMouse) > 0.3) pitch += Math.max(-0.6, Math.min(0.6, pitchMouse * 0.8));
      }

      // Throttle: Shift up, Control down, wheel fine-tunes.
      let thr = throttle;
      if (this.down('Shift')) thr += 0.55 * 0.016;
      if (this.down('Control')) thr -= 0.7 * 0.016;
      if (this.down('+', '=')) thr += 0.02;
      if (this.down('-', '_')) thr -= 0.02;
      const wheel = this.takeWheel();
      if (wheel !== 0) thr -= Math.sign(wheel) * 0.06;
      thr = Math.max(0, Math.min(1, thr));

      return {
        pitch: Math.max(-1, Math.min(1, pitch)),
        roll: Math.max(-1, Math.min(1, roll)),
        throttle: thr,
      };
    },
  };
  return input;
}
