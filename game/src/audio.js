// audio.js — every sound is synthesised with WebAudio: engine hum, wind,
// ring chimes and the crash. No audio files, no network, nothing to load.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    engineFilter: null,
    windSource: null,
    windGain: null,
    windFilter: null,
    started: false,

    /** Call from a user gesture; browsers block audio before one. */
    start() {
      if (this.started) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.started = true;
      } catch (e) { this.ctx = null; return; }
      const ctx = this.ctx;

      // Engine: two detuned saws through a low-pass, pitch follows throttle.
      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineOsc2 = ctx.createOscillator();
      this.engineOsc2.type = 'sawtooth';
      this.engineOsc2.frequency.value = 55.7;
      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);
      this.engineOsc.start();
      this.engineOsc2.start();

      // Wind: looped noise through a band-pass, louder the faster you fly.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = buf;
      this.windSource.loop = true;
      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 480;
      this.windFilter.Q.value = 0.6;
      this.windGain = ctx.createGain();
      this.windGain.gain.value = 0;
      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(ctx.destination);
      this.windSource.start();
    },

    /** Continuous engine + wind levels, called every frame. */
    update(throttle, speed, airborne) {
      if (!this.ctx || this.muted) {
        if (this.engineGain) this.engineGain.gain.value = 0;
        if (this.windGain) this.windGain.gain.value = 0;
        return;
      }
      const t = this.ctx.currentTime;
      const freq = 52 + throttle * 88 + speed * 0.35;
      this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(freq * 1.013, t, 0.08);
      this.engineFilter.frequency.setTargetAtTime(280 + throttle * 900, t, 0.1);
      const engineLevel = airborne || throttle > 0.05 ? 0.045 + throttle * 0.05 : 0;
      this.engineGain.gain.setTargetAtTime(engineLevel, t, 0.1);
      const windLevel = Math.min(0.16, speed * 0.0016);
      this.windGain.gain.setTargetAtTime(airborne ? windLevel : 0, t, 0.15);
      this.windFilter.frequency.setTargetAtTime(380 + speed * 6, t, 0.15);
    },

    /** A short tone. */
    blip(freq, dur, type, vol, when = 0) {
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },

    ring(center) {
      this.blip(880, 0.22, 'sine', 0.18);
      this.blip(1318, 0.3, 'sine', 0.14, 0.07);
      if (center) this.blip(1760, 0.34, 'sine', 0.12, 0.14);
    },

    crash() {
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const len = ctx.sampleRate * 0.7;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      this.blip(48, 0.6, 'sine', 0.4);
    },

    land() {
      [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.32, 'triangle', 0.15, i * 0.11));
    },

    click() { this.blip(660, 0.07, 'square', 0.05); },

    toggleMute() {
      this.muted = !this.muted;
      if (this.muted) this.update(0, 0, false);
      return this.muted;
    },
  };
  return audio;
}
