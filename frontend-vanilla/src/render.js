// render.js — Lớp vẽ trò chơi Pac-man lên canvas.
//
// Tọa độ trong dữ liệu là (row, col). Khi vẽ: x = col * cell, y = row * cell.
// Renderer giữ kích thước bản đồ (width/height theo ô) và tự tính cell size
// để vừa khung canvas, đồng thời căn giữa bản đồ.

const GHOST_COLORS = ["#ff4d4d", "#ff9ce0", "#36c5f0", "#ffa94d"];
const SCARED_COLOR = "#2249d6";

const Render = {
  canvas: null,
  ctx: null,
  map: null, // {width, height, walls, food, power_pellets, pacman_start, ghosts_start}

  // Tập tra cứu nhanh dựng từ map.
  _walls: null,

  // Lớp minh họa thuật toán.
  visited: [], // mảng [r,c] các ô đã expand (tô dần theo animation)
  path: [], // mảng [r,c] đường đi cuối cùng

  // Trạng thái động đang hiển thị (chế độ đối kháng hoặc khi animate path).
  pacman: null, // [r,c]
  pacDir: "RIGHT",
  ghosts: [], // [{pos:[r,c], direction, scared}]
  food: null, // Set "r,c"
  pellets: null, // Set "r,c"

  cell: 24,
  offsetX: 0,
  offsetY: 0,
  _mouthPhase: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  },

  _key(rc) {
    return rc[0] + "," + rc[1];
  },

  // Nạp bản đồ mới và đặt lại trạng thái hiển thị về initial.
  setMap(map) {
    this.map = map;
    this._walls = new Set(map.walls.map((p) => this._key(p)));
    this._computeCell();
    this.reset();
  },

  _computeCell() {
    const { width, height } = this.map;
    const pad = 8;
    const cw = (this.canvas.width - pad * 2) / width;
    const ch = (this.canvas.height - pad * 2) / height;
    this.cell = Math.floor(Math.min(cw, ch));
    this.offsetX = Math.floor((this.canvas.width - this.cell * width) / 2);
    this.offsetY = Math.floor((this.canvas.height - this.cell * height) / 2);
  },

  // Đặt lại về trạng thái xuất phát của bản đồ.
  reset() {
    if (!this.map) return;
    this.visited = [];
    this.path = [];
    this.pacman = this.map.pacman_start.slice();
    this.pacDir = "RIGHT";
    this.ghosts = (this.map.ghosts_start || []).map((p, i) => ({
      pos: p.slice(),
      direction: "STOP",
      scared: false,
      color: GHOST_COLORS[i % GHOST_COLORS.length],
    }));
    this.food = new Set(this.map.food.map((p) => this._key(p)));
    this.pellets = new Set(this.map.power_pellets.map((p) => this._key(p)));
    this.draw();
  },

  // Cập nhật trạng thái động từ một frame serialize (chế độ đối kháng).
  setState(st) {
    this.pacman = st.pacman.slice();
    this.food = new Set(st.food.map((p) => this._key(p)));
    this.pellets = new Set(st.power_pellets.map((p) => this._key(p)));
    this.ghosts = st.ghosts.map((g, i) => ({
      pos: g.pos.slice(),
      direction: g.direction,
      scared: g.scared,
      color: GHOST_COLORS[i % GHOST_COLORS.length],
    }));
  },

  setPacman(rc, dir) {
    this.pacman = rc.slice();
    if (dir) this.pacDir = dir;
  },

  // Toàn bộ vẽ lại 1 frame.
  draw() {
    if (!this.map) return;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this._drawVisited();
    this._drawWalls();
    this._drawFood();
    this._drawPath();
    this._drawGhosts();
    this._drawPacman();
  },

  _px(rc) {
    return [this.offsetX + rc[1] * this.cell, this.offsetY + rc[0] * this.cell];
  },

  _drawWalls() {
    const { ctx, cell } = this;
    ctx.fillStyle = "#2249d6";
    for (const k of this._walls) {
      const [r, c] = k.split(",").map(Number);
      const [x, y] = this._px([r, c]);
      ctx.fillStyle = "#10153a";
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = "#2249d6";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    }
  },

  _drawFood() {
    const { ctx, cell } = this;
    ctx.fillStyle = "#ffb8ae";
    for (const k of this.food) {
      const [r, c] = k.split(",").map(Number);
      const [x, y] = this._px([r, c]);
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, Math.max(2, cell * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
    // Power pellet — chấm lớn nhấp nháy.
    const blink = (Math.floor(Date.now() / 350) % 2) === 0;
    ctx.fillStyle = blink ? "#fff04d" : "#bcae20";
    for (const k of this.pellets) {
      const [r, c] = k.split(",").map(Number);
      const [x, y] = this._px([r, c]);
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, Math.max(4, cell * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  },

  _drawVisited() {
    const { ctx, cell } = this;
    const n = this.visited.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = this._px(this.visited[i]);
      // Gradient theo thứ tự duyệt: cũ -> mới càng đậm.
      const t = n > 1 ? i / (n - 1) : 1;
      ctx.fillStyle = `rgba(54, 197, 240, ${0.12 + t * 0.28})`;
      ctx.fillRect(x, y, cell, cell);
    }
  },

  _drawPath() {
    const { ctx, cell } = this;
    if (this.path.length < 2) return;
    ctx.strokeStyle = "rgba(255, 210, 63, 0.85)";
    ctx.lineWidth = Math.max(2, cell * 0.16);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    this.path.forEach((rc, i) => {
      const [x, y] = this._px(rc);
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
  },

  _drawPacman() {
    if (!this.pacman) return;
    const { ctx, cell } = this;
    const [x, y] = this._px(this.pacman);
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const r = cell * 0.42;
    // Góc miệng dao động để tạo animation mở/khép.
    const open = 0.12 + 0.18 * (1 + Math.sin(this._mouthPhase)) ;
    const dirAngle = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2, STOP: 0 };
    const a = dirAngle[this.pacDir] ?? 0;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a + open * Math.PI, a - open * Math.PI + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  },

  _drawGhosts() {
    const { ctx, cell } = this;
    const blink = (Math.floor(Date.now() / 250) % 2) === 0;
    for (const g of this.ghosts) {
      const [x, y] = this._px(g.pos);
      const r = cell * 0.4;
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      let color = g.color || GHOST_COLORS[0];
      if (g.scared) color = blink ? SCARED_COLOR : "#cfd8ff";
      ctx.fillStyle = color;
      // Thân hình: nửa tròn trên + đáy lượn sóng.
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
      const bottom = cy + r * 0.85;
      ctx.lineTo(cx + r, bottom);
      const waves = 3;
      for (let i = 0; i < waves; i++) {
        const x1 = cx + r - (2 * r) * ((i + 0.5) / waves);
        const x2 = cx + r - (2 * r) * ((i + 1) / waves);
        ctx.lineTo(x1, bottom - r * 0.25);
        ctx.lineTo(x2, bottom);
      }
      ctx.closePath();
      ctx.fill();
      // Mắt.
      ctx.fillStyle = "#fff";
      const ex = r * 0.35;
      ctx.beginPath();
      ctx.arc(cx - ex, cy - r * 0.1, r * 0.22, 0, Math.PI * 2);
      ctx.arc(cx + ex, cy - r * 0.1, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b0c10";
      ctx.beginPath();
      ctx.arc(cx - ex, cy - r * 0.05, r * 0.1, 0, Math.PI * 2);
      ctx.arc(cx + ex, cy - r * 0.05, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // Hiển thị dần các ô visited (minh họa quá trình tìm kiếm), rồi vẽ path.
  // visitedOrder, pathCells: mảng [r,c]. Trả Promise hoàn tất khi animate xong.
  animateSearch(visitedOrder, pathCells, stepDelay, shouldStop) {
    return new Promise((resolve) => {
      this.visited = [];
      this.path = [];
      let i = 0;
      const batch = Math.max(1, Math.floor(visitedOrder.length / 120));
      const tick = () => {
        if (shouldStop && shouldStop()) return resolve();
        for (let k = 0; k < batch && i < visitedOrder.length; k++, i++) {
          this.visited.push(visitedOrder[i]);
        }
        this.draw();
        if (i < visitedOrder.length) {
          setTimeout(tick, stepDelay);
        } else {
          this.path = pathCells.slice();
          this.draw();
          resolve();
        }
      };
      tick();
    });
  },

  // Animate Pac-man đi dọc path (mảng [r,c]).
  animatePath(pathCells, stepDelay, shouldStop) {
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        if (shouldStop && shouldStop()) return resolve();
        if (i >= pathCells.length) return resolve();
        const cur = pathCells[i];
        if (i > 0) {
          const prev = pathCells[i - 1];
          this.pacDir = this._dirOf(prev, cur);
          if (this.food.delete(this._key(cur))) {/* ăn food */}
          this.pellets.delete(this._key(cur));
        }
        this.pacman = cur.slice();
        this._mouthPhase += 0.9;
        this.draw();
        i++;
        setTimeout(tick, stepDelay);
      };
      tick();
    });
  },

  _dirOf(a, b) {
    const dr = b[0] - a[0];
    const dc = b[1] - a[1];
    if (dr < 0) return "UP";
    if (dr > 0) return "DOWN";
    if (dc < 0) return "LEFT";
    if (dc > 0) return "RIGHT";
    return "STOP";
  },
};
