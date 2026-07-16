// PacmanRenderer.js — Class that draws the Pac-man game onto a 2D canvas (imperative).
//
// Data coordinates are (row, col). When drawing: x = col * cell, y = row * cell.
// The renderer computes its own cell size to fit the canvas and center the map.
// Used in React via a ref so animation doesn't depend on the component render cycle.

// Original arcade color palette (kept in sync with @theme in index.css).
const GHOST_COLORS = ["#FF0000", "#FFB8FF", "#00FFFF", "#FFB852"];
const WALL_FILL = "#0a0f3a";
const WALL_STROKE = "#2121DE";
const FOOD_COLOR = "#FFB897";
const PAC_COLOR = "#FFE600";
const VISITED_RGB = "0, 255, 255"; // inky cyan for the "visited" layer
const PATH_COLOR = "rgba(255, 230, 0, 0.85)";
const PAUSE_POLL_MS = 60; // recheck interval while animation is paused

export class PacmanRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.map = null;
    this._walls = null;

    this.visited = [];
    this.path = [];
    this.goal = null; // target cell chosen by user click (path_to_cell exercise)
    this.problem = "eat_all";

    this.pacman = null;
    this.pacDir = "RIGHT";
    this.ghosts = [];
    this.food = null;

    this.cell = 24;
    this.offsetX = 0;
    this.offsetY = 0;
    this._mouthPhase = 0;
    this.reducedMotion = false;

    // Effects hook: called when Pac-man eats food (assigned externally).
    this.onEat = null; // (centerX, centerY) => void
  }

  _key(rc) {
    return rc[0] + "," + rc[1];
  }

  setMap(map) {
    this.map = map;
    this._walls = new Set(map.walls.map((p) => this._key(p)));
    this._computeCell();
    this.reset();
  }

  _computeCell() {
    const { width, height } = this.map;
    const pad = 8;
    const cw = (this.canvas.width - pad * 2) / width;
    const ch = (this.canvas.height - pad * 2) / height;
    this.cell = Math.floor(Math.min(cw, ch));
    this.offsetX = Math.floor((this.canvas.width - this.cell * width) / 2);
    this.offsetY = Math.floor((this.canvas.height - this.cell * height) / 2);
  }

  reset() {
    if (!this.map) return;
    this.visited = [];
    this.path = [];
    this.pacman = this.map.pacman_start.slice();
    this.pacDir = "RIGHT";
    this.ghosts = (this.map.ghosts_start || []).map((p, i) => ({
      pos: p.slice(),
      color: GHOST_COLORS[i % GHOST_COLORS.length],
    }));
    this.food = new Set(this.map.food.map((p) => this._key(p)));
    this.draw();
  }

  setPacman(rc, dir) {
    this.pacman = rc.slice();
    if (dir) this.pacDir = dir;
  }

  setGoal(rc) {
    this.goal = rc ? rc.slice() : null;
    this.draw();
  }

  setProblem(problem) {
    this.problem = problem;
    this.draw();
  }

  clearGoal() {
    this.goal = null;
    this.draw();
  }

  nextGoalCell(current, key) {
    if (!this.map) return null;
    const delta = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[key];
    const start = current || this.goal || this.pacman || this.map.pacman_start;
    if (!delta || !start) return start ? start.slice() : null;
    const next = [start[0] + delta[0], start[1] + delta[1]];
    const valid = next[0] >= 0 && next[0] < this.map.height
      && next[1] >= 0 && next[1] < this.map.width
      && !this._walls.has(this._key(next));
    return valid ? next : start.slice();
  }

  // Converts pointer coordinates (clientX/Y) -> cell [row, col] on the map.
  // The canvas may be CSS-scaled, so we must scale by getBoundingClientRect.
  // Returns null if outside the map or on a wall (invalid cell for a target).
  pixelToCell(clientX, clientY) {
    if (!this.map) return null;
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * sx;
    const y = (clientY - rect.top) * sy;
    const col = Math.floor((x - this.offsetX) / this.cell);
    const row = Math.floor((y - this.offsetY) / this.cell);
    if (row < 0 || row >= this.map.height || col < 0 || col >= this.map.width) return null;
    if (this._walls.has(this._key([row, col]))) return null;
    return [row, col];
  }

  // Tree traversal jumps between independent search states, not along one path.
  // Restore the selected node's food set so switching branches stays truthful.
  setSearchNode(node, { animate = true } = {}) {
    if (!node) return;
    this.setPacman(node.pos, node.action || this._dirOf(this.pacman, node.pos));
    this._prevPacman = node.pos.slice();
    if (this.problem === "eat_all") {
      this.food = new Set((node.food || []).map((position) => this._key(position)));
    }
    if (animate) this._mouthPhase += 0.9;
  }

  // Deletes food at cell `rc` (if any) and fires the eat effect.
  _eatAt(rc, effect = true) {
    if (this.problem === "path_to_cell") return;
    const k = this._key(rc);
    const ateFood = this.food.delete(k);
    if (effect && this.onEat && ateFood) {
      const [x, y] = this._px(rc);
      this.onEat(x + this.cell / 2, y + this.cell / 2);
    }
  }

  draw() {
    if (!this.map) return;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this._drawVisited();
    this._drawWalls();
    if (this.problem !== "path_to_cell") this._drawFood();
    this._drawGoal();
    this._drawPath();
    this._drawGhosts();
    this._drawPacman();
  }

  // Target cell chosen by the user (path_to_cell exercise): blinking square outline
  // + a cross in the middle, inky cyan to distinguish from the path (yellow) and visited cells.
  _drawGoal() {
    if (!this.goal) return;
    const { ctx, cell } = this;
    const [x, y] = this._px(this.goal);
    const blink = this.reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(Date.now() / 200);
    ctx.save();
    ctx.strokeStyle = `rgba(${VISITED_RGB}, ${blink})`;
    ctx.lineWidth = Math.max(2, cell * 0.12);
    ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const r = cell * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.restore();
  }

  _px(rc) {
    return [this.offsetX + rc[1] * this.cell, this.offsetY + rc[0] * this.cell];
  }

  _drawWalls() {
    const { ctx, cell } = this;
    for (const k of this._walls) {
      const [r, c] = k.split(",").map(Number);
      const [x, y] = this._px([r, c]);
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = WALL_STROKE;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    }
  }

  _drawFood() {
    const { ctx, cell } = this;
    ctx.fillStyle = FOOD_COLOR;
    for (const k of this.food) {
      const [r, c] = k.split(",").map(Number);
      const [x, y] = this._px([r, c]);
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, Math.max(2, cell * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawVisited() {
    const { ctx, cell } = this;
    const n = this.visited.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = this._px(this.visited[i]);
      const t = n > 1 ? i / (n - 1) : 1;
      ctx.fillStyle = `rgba(${VISITED_RGB}, ${0.1 + t * 0.3})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  _drawPath() {
    const { ctx, cell } = this;
    if (this.path.length < 2) return;
    ctx.strokeStyle = PATH_COLOR;
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
  }

  _drawPacman() {
    if (!this.pacman) return;
    const { ctx, cell } = this;
    const [x, y] = this._px(this.pacman);
    const cx = x + cell / 2;
    const cy = y + cell / 2;
    const r = cell * 0.42;
    const open = 0.12 + 0.18 * (1 + Math.sin(this._mouthPhase));
    const dirAngle = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2, STOP: 0 };
    const a = dirAngle[this.pacDir] ?? 0;
    ctx.fillStyle = PAC_COLOR;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a + open * Math.PI, a - open * Math.PI + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  _drawGhosts() {
    const { ctx, cell } = this;
    for (const g of this.ghosts) {
      const [x, y] = this._px(g.pos);
      const r = cell * 0.4;
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      ctx.fillStyle = g.color || GHOST_COLORS[0];
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
      const bottom = cy + r * 0.85;
      ctx.lineTo(cx + r, bottom);
      const waves = 3;
      for (let i = 0; i < waves; i++) {
        const x1 = cx + r - 2 * r * ((i + 0.5) / waves);
        const x2 = cx + r - 2 * r * ((i + 1) / waves);
        ctx.lineTo(x1, bottom - r * 0.25);
        ctx.lineTo(x2, bottom);
      }
      ctx.closePath();
      ctx.fill();
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
  }

  // Traversal phase: Pac-man stands on the currently selected tree node, no map coloring.
  animateSearch(treeNodes, stepDelay, shouldStop, onStep, shouldPause) {
    return new Promise((resolve) => {
      this.visited = [];
      this.path = [];
      const nodes = (treeNodes || [])
        .filter((n) => n.expanded_order != null)
        .sort((a, b) => a.expanded_order - b.expanded_order);
      let i = 0;
      const tick = () => {
        if (shouldStop && shouldStop()) return resolve();
        if (shouldPause && shouldPause()) {
          setTimeout(tick, PAUSE_POLL_MS);
          return;
        }
        if (i < nodes.length) {
          const node = nodes[i];
          this.setSearchNode(node);
          i++;
        }
        this.draw();
        if (onStep) onStep(i);
        if (i < nodes.length) {
          setTimeout(tick, stepDelay);
        } else {
          resolve();
        }
      };
      tick();
    });
  }

  // Animates Pac-man moving along the path (array of [r,c]).
  animatePath(pathCells, stepDelay, shouldStop, shouldPause) {
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        if (shouldStop && shouldStop()) return resolve();
        if (shouldPause && shouldPause()) {
          setTimeout(tick, PAUSE_POLL_MS);
          return;
        }
        if (i >= pathCells.length) return resolve();
        const cur = pathCells[i];
        if (i > 0) {
          this.pacDir = this._dirOf(pathCells[i - 1], cur);
          this._eatAt(cur);
        }
        this.pacman = cur.slice();
        this._prevPacman = cur.slice();
        this._mouthPhase += 0.9;
        // Grow the route line as Pac-man advances (kept after finishing).
        this.path = pathCells.slice(0, i + 1);
        this.draw();
        i++;
        setTimeout(tick, stepDelay);
      };
      tick();
    });
  }

  _dirOf(a, b) {
    const dr = b[0] - a[0];
    const dc = b[1] - a[1];
    if (dr < 0) return "UP";
    if (dr > 0) return "DOWN";
    if (dc < 0) return "LEFT";
    if (dc > 0) return "RIGHT";
    return "STOP";
  }
}
