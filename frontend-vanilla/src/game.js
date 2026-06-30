// game.js — Điều phối toàn bộ: kết nối API, Render và Controls.
//
// Vòng đời:
//   1. Khởi tạo Render + Controls, nạp danh sách bản đồ/thuật toán từ backend.
//   2. Đổi bản đồ -> tải layout, vẽ trạng thái xuất phát.
//   3. Nút "Chạy": tùy chế độ mà gọi /solve (tĩnh) hoặc /adversarial (đối kháng),
//      rồi animate kết quả lên canvas.
//   4. Các nút Tạm dừng / Từng bước / Đặt lại / So sánh.

const Game = {
  // Cờ điều khiển animation.
  _stop: false,
  _paused: false,
  _running: false,

  // Lưu kết quả lần solve gần nhất để hỗ trợ "Từng bước".
  _lastSolve: null, // {path, visited_order, stats, found}
  _lastFrames: null, // chế độ đối kháng: danh sách frame
  _stepIndex: 0,

  async init() {
    const canvas = document.getElementById("board");
    Render.init(canvas);
    Controls.init();

    this._bindButtons();

    // Vẽ lại liên tục để các hiệu ứng nhấp nháy (pellet, ma sợ, miệng Pac-man)
    // luôn động, kể cả khi đứng yên.
    const loop = () => {
      Render.draw();
      requestAnimationFrame(loop);
    };

    try {
      await this._loadMetadata();
    } catch (e) {
      Controls.setStatus("Lỗi kết nối backend: " + e.message);
      console.error(e);
      return;
    }

    requestAnimationFrame(loop);
  },

  // Nạp danh sách bản đồ + thuật toán, rồi tải bản đồ đầu tiên.
  async _loadMetadata() {
    const [mapsResp, algoResp] = await Promise.all([
      Api.getMaps(),
      Api.getAlgorithms(),
    ]);

    const mapNames = mapsResp.maps.map((m) => m.name);
    Controls.populateMaps(mapNames);
    Controls.populateAlgorithms(algoResp.algorithms, algoResp.heuristics);

    // Đổi bản đồ -> tải layout mới.
    Controls.el.mapSelect.addEventListener("change", () => this._loadMap());

    await this._loadMap();
  },

  // Tải layout bản đồ đang chọn và vẽ trạng thái xuất phát.
  async _loadMap() {
    this._stopAnimation();
    const name = Controls.el.mapSelect.value;
    const map = await Api.getMap(name);
    Render.setMap(map);
    Controls.clearStats();
    Controls.clearCompare();
    this._lastSolve = null;
    this._lastFrames = null;
    this._stepIndex = 0;
    Controls.setStatus("Sẵn sàng");
  },

  _bindButtons() {
    const el = Controls.el;
    el.runBtn.addEventListener("click", () => this._onRun());
    el.pauseBtn.addEventListener("click", () => this._onPause());
    el.stepBtn.addEventListener("click", () => this._onStep());
    el.resetBtn.addEventListener("click", () => this._onReset());
    el.compareBtn.addEventListener("click", () => this._onCompare());
  },

  _stopAnimation() {
    this._stop = true;
    this._paused = false;
    this._running = false;
  },

  // shouldStop được truyền vào các hàm animate của Render.
  _shouldStop() {
    return this._stop;
  },

  // --- Nút Chạy ---
  async _onRun() {
    if (this._running) return;
    const cfg = Controls.config();
    Render.reset();
    this._stop = false;
    this._running = true;
    Controls.setBusy(true);
    try {
      if (cfg.mode === "static") {
        await this._runStatic(cfg);
      } else {
        await this._runAdversarial(cfg);
      }
    } catch (e) {
      Controls.setStatus("Lỗi: " + e.message);
      console.error(e);
    } finally {
      this._running = false;
      Controls.setBusy(false);
    }
  },

  async _runStatic(cfg) {
    Controls.setStatus("Đang chạy " + cfg.algorithm + "...");
    const result = await Api.solve({
      map: cfg.map,
      algorithm: cfg.algorithm,
      heuristic: cfg.heuristic,
      problem: cfg.problem,
    });

    this._lastSolve = result;
    this._stepIndex = 0;

    if (!result.found) {
      Controls.showStaticStats(result.stats, "Không tìm thấy lời giải");
      Render.visited = result.visited_order.slice();
      Render.draw();
      return;
    }

    const delay = Controls.stepDelay();
    // Minh họa quá trình tìm kiếm (các ô expand), sau đó vẽ đường đi.
    await Render.animateSearch(result.visited_order, result.path, Math.max(4, delay / 4), () => this._shouldStop());
    if (this._shouldStop()) return;
    // Cho Pac-man đi dọc đường đi tìm được.
    await Render.animatePath(result.path, delay, () => this._shouldStop());

    Controls.showStaticStats(result.stats, "Hoàn tất");
  },

  async _runAdversarial(cfg) {
    Controls.setStatus("Đang mô phỏng " + cfg.advAlgorithm + "...");
    const result = await Api.adversarial({
      map: cfg.map,
      algorithm: cfg.advAlgorithm,
      depth: cfg.depth,
      max_steps: 200,
    });

    this._lastFrames = result.frames;
    this._stepIndex = 0;

    const delay = Controls.stepDelay();
    await this._playFrames(result.frames, delay);
    Controls.showAdversarialStats(result.stats);
  },

  // Phát lần lượt các frame của ván đối kháng lên canvas.
  _playFrames(frames, delay) {
    return new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        if (this._shouldStop()) return resolve();
        if (this._paused) {
          setTimeout(tick, 60);
          return;
        }
        if (i >= frames.length) return resolve();
        Render.setState(frames[i]);
        Render._mouthPhase += 0.9;
        Render.draw();
        this._stepIndex = i;
        i++;
        setTimeout(tick, delay);
      };
      tick();
    });
  },

  // --- Nút Tạm dừng / Tiếp tục ---
  _onPause() {
    if (!this._running) return;
    this._paused = !this._paused;
    Controls.el.pauseBtn.textContent = this._paused ? "Tiếp tục" : "Tạm dừng";
    Controls.setStatus(this._paused ? "Tạm dừng" : "Đang chạy...");
  },

  // --- Nút Từng bước ---
  // Tĩnh: yêu cầu đã solve trước, hiển thị thêm 1 ô của đường đi mỗi lần bấm.
  // Đối kháng: yêu cầu đã có frames, tiến 1 frame mỗi lần bấm.
  async _onStep() {
    const cfg = Controls.config();
    if (cfg.mode === "static") {
      await this._stepStatic(cfg);
    } else {
      this._stepAdversarial(cfg);
    }
  },

  async _stepStatic(cfg) {
    // Nếu chưa solve, solve trước (không animate).
    if (!this._lastSolve) {
      Controls.setBusy(true);
      try {
        const result = await Api.solve({
          map: cfg.map,
          algorithm: cfg.algorithm,
          heuristic: cfg.heuristic,
          problem: cfg.problem,
        });
        this._lastSolve = result;
        this._stepIndex = 0;
        Render.reset();
        Render.visited = result.visited_order.slice();
        Render.path = [];
        Render.draw();
        Controls.showStaticStats(result.stats, result.found ? "Đã giải — bấm Từng bước để đi" : "Không tìm thấy");
      } finally {
        Controls.setBusy(false);
      }
      return;
    }

    const path = this._lastSolve.path;
    if (!path || this._stepIndex >= path.length) {
      Controls.setStatus("Đã đi hết đường");
      return;
    }
    // Hiển thị dần đường đi tới chỉ số hiện tại.
    Render.path = path.slice(0, this._stepIndex + 1);
    const cur = path[this._stepIndex];
    if (this._stepIndex > 0) {
      const prev = path[this._stepIndex - 1];
      Render.setPacman(cur, Render._dirOf(prev, cur));
      Render.food.delete(Render._key(cur));
      Render.pellets.delete(Render._key(cur));
    } else {
      Render.setPacman(cur, "RIGHT");
    }
    Render._mouthPhase += 0.9;
    Render.draw();
    this._stepIndex++;
    Controls.setStatus(`Bước ${this._stepIndex}/${path.length}`);
  },

  _stepAdversarial(cfg) {
    if (!this._lastFrames) {
      Controls.setStatus("Bấm Chạy trước để mô phỏng, rồi mới đi từng bước");
      return;
    }
    if (this._stepIndex >= this._lastFrames.length) {
      Controls.setStatus("Đã hết frame");
      return;
    }
    Render.setState(this._lastFrames[this._stepIndex]);
    Render._mouthPhase += 0.9;
    Render.draw();
    this._stepIndex++;
    Controls.setStatus(`Frame ${this._stepIndex}/${this._lastFrames.length}`);
  },

  // --- Nút Đặt lại ---
  _onReset() {
    this._stopAnimation();
    Render.reset();
    Controls.clearStats();
    this._lastSolve = null;
    this._lastFrames = null;
    this._stepIndex = 0;
    Controls.el.pauseBtn.textContent = "Tạm dừng";
    Controls.setStatus("Đã đặt lại");
  },

  // --- Nút So sánh tất cả thuật toán ---
  async _onCompare() {
    const cfg = Controls.config();
    Controls.setBusy(true);
    Controls.setStatus("Đang so sánh các thuật toán...");
    try {
      const result = await Api.compare({
        map: cfg.map,
        algorithms: ["bfs", "dfs", "ucs", "ids", "greedy", "astar"],
        heuristic: cfg.heuristic,
        problem: cfg.problem,
      });
      Controls.showCompare(result.results);
      Controls.setStatus("So sánh xong");
    } catch (e) {
      Controls.setStatus("Lỗi so sánh: " + e.message);
      console.error(e);
    } finally {
      Controls.setBusy(false);
    }
  },
};

window.addEventListener("DOMContentLoaded", () => Game.init());
