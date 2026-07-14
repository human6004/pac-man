// audio.js — 8-bit arcade sound generated with WebAudio (no files needed, runs offline).
//
// Uses square/triangle oscillators to mimic classic arcade machine sounds. A single
// shared AudioContext is only created after user interaction (browser autoplay policy).

class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._lastMove = 0;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on) {
    this.enabled = on;
  }

  // A single note: waveform type, frequency, duration, volume.
  _blip(freq, dur = 0.08, type = "square", vol = 0.18) {
    if (!this.enabled) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // Sweeps frequency from f1 -> f2 (used for win/coin).
  _sweep(f1, f2, dur = 0.25, type = "square", vol = 0.16) {
    if (!this.enabled) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(f2, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // --- Effects triggered by game events ---
  eat() {
    // "Waka" sound alternating between 2 pitches, rate-limited.
    const now = performance.now();
    if (now - this._lastMove < 70) return;
    this._lastMove = now;
    const hi = Math.floor(now / 140) % 2 === 0;
    this._blip(hi ? 520 : 380, 0.06, "square", 0.12);
  }

  coin() {
    this._blip(988, 0.08, "square", 0.18);
    setTimeout(() => this._blip(1319, 0.16, "square", 0.18), 80);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this._blip(f, 0.18, "square", 0.18), i * 120));
  }

  start() {
    this.coin();
  }
}

export const audio = new ArcadeAudio();
