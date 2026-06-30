// audio.js — Âm thanh arcade 8-bit tạo bằng WebAudio (không cần file, chạy offline).
//
// Dùng oscillator vuông/tam giác để mô phỏng tiếng máy game cổ. Một AudioContext
// dùng chung; chỉ khởi tạo sau tương tác người dùng (chính sách autoplay trình duyệt).

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

  // Một nốt đơn: type sóng, tần số, thời lượng, âm lượng.
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

  // Lướt tần số từ f1 -> f2 (dùng cho win/coin).
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

  // --- Hiệu ứng theo sự kiện game ---
  eat() {
    // Tiếng "waka" luân phiên 2 cao độ, tiết chế tần suất.
    const now = performance.now();
    if (now - this._lastMove < 70) return;
    this._lastMove = now;
    const hi = Math.floor(now / 140) % 2 === 0;
    this._blip(hi ? 520 : 380, 0.06, "square", 0.12);
  }

  move() {
    const now = performance.now();
    if (now - this._lastMove < 90) return;
    this._lastMove = now;
    this._blip(180, 0.04, "triangle", 0.07);
  }

  pellet() {
    this._blip(660, 0.12, "square", 0.16);
  }

  eatGhost() {
    this._sweep(300, 900, 0.22, "square", 0.18);
  }

  coin() {
    this._blip(988, 0.08, "square", 0.18);
    setTimeout(() => this._blip(1319, 0.16, "square", 0.18), 80);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this._blip(f, 0.18, "square", 0.18), i * 120));
  }

  lose() {
    this._sweep(440, 80, 0.6, "sawtooth", 0.2);
  }

  start() {
    this.coin();
  }
}

export const audio = new ArcadeAudio();
