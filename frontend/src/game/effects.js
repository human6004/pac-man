// effects.js — Hiệu ứng game phủ lên canvas: particle khi ăn food + screen-shake.
//
// Dùng chung hệ tọa độ pixel với PacmanRenderer (đã offset/cell). Renderer gọi
// effects.spawnBurst(cx, cy) khi ăn, và effects.draw(ctx) ở cuối mỗi frame.

class Effects {
  constructor() {
    this.particles = [];
    this._shake = 0;
  }

  // Nổ chùm hạt nhỏ tại tâm (cx, cy) màu tùy chọn.
  spawnBurst(cx, cy, color = "#FFE600", count = 8) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 0.8 + Math.random() * 1.6;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 1,
        decay: 0.04 + Math.random() * 0.03,
        color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  shake(amount = 6) {
    this._shake = Math.max(this._shake, amount);
  }

  // Trả về [dx, dy] dịch khung khi shake (gọi trước khi vẽ frame).
  shakeOffset() {
    if (this._shake <= 0.1) {
      this._shake = 0;
      return [0, 0];
    }
    const dx = (Math.random() - 0.5) * this._shake;
    const dy = (Math.random() - 0.5) * this._shake;
    this._shake *= 0.85;
    return [dx, dy];
  }

  update() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06; // trọng lực nhẹ
      p.life -= p.decay;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles = [];
    this._shake = 0;
  }
}

export const effects = new Effects();
