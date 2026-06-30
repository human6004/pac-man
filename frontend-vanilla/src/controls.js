// controls.js — Quản lý DOM và tương tác người dùng.
//
// Controls giữ tham chiếu tới mọi phần tử điều khiển, nạp dropdown từ backend,
// cung cấp getter cho lựa chọn hiện tại, và cập nhật bảng thống kê/so sánh.
// game.js dùng Controls để đọc cấu hình và đăng ký callback cho các nút.

const Controls = {
  el: {}, // tập tham chiếu DOM

  // Lưu thông tin thuật toán để biết cái nào dùng heuristic.
  _algoInfo: {}, // key -> {name, group, uses_heuristic}

  init() {
    const id = (x) => document.getElementById(x);
    this.el = {
      mapSelect: id("mapSelect"),
      modeSelect: id("modeSelect"),
      staticControls: id("staticControls"),
      adversarialControls: id("adversarialControls"),
      problemSelect: id("problemSelect"),
      algoSelect: id("algoSelect"),
      heuristicRow: id("heuristicRow"),
      heuristicSelect: id("heuristicSelect"),
      advAlgoSelect: id("advAlgoSelect"),
      depthRange: id("depthRange"),
      depthValue: id("depthValue"),
      speedRange: id("speedRange"),
      speedValue: id("speedValue"),
      runBtn: id("runBtn"),
      pauseBtn: id("pauseBtn"),
      stepBtn: id("stepBtn"),
      resetBtn: id("resetBtn"),
      compareBtn: id("compareBtn"),
      // Ô thống kê
      stStatus: id("stStatus"),
      stExpanded: id("stExpanded"),
      stGenerated: id("stGenerated"),
      stFrontier: id("stFrontier"),
      stTime: id("stTime"),
      stPath: id("stPath"),
      stCost: id("stCost"),
      stScore: id("stScore"),
      compareTable: id("compareTable"),
    };

    // Cập nhật nhãn slider theo thời gian thực.
    this.el.depthRange.addEventListener("input", () => {
      this.el.depthValue.textContent = this.el.depthRange.value;
    });
    this.el.speedRange.addEventListener("input", () => {
      this.el.speedValue.textContent = this.el.speedRange.value;
    });

    // Chuyển chế độ tĩnh / đối kháng.
    this.el.modeSelect.addEventListener("change", () => this._applyMode());

    // Hiện/ẩn heuristic theo thuật toán đang chọn.
    this.el.algoSelect.addEventListener("change", () => this._applyHeuristicVisibility());

    this._applyMode();
  },

  // Nạp dropdown bản đồ.
  populateMaps(names) {
    const sel = this.el.mapSelect;
    sel.innerHTML = "";
    for (const name of names) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    }
    // Mặc định chọn 'small': bài "ăn hết food" chỉ chạy kịp trên bản đồ nhỏ.
    // Bản đồ lớn (classic/medium) có 2^N trạng thái -> dễ treo nếu chọn nhầm.
    if (names.includes("small")) sel.value = "small";
  },

  // Nạp dropdown thuật toán tĩnh + heuristic từ GET /algorithms.
  populateAlgorithms(algorithms, heuristics) {
    this._algoInfo = {};
    const staticSel = this.el.algoSelect;
    staticSel.innerHTML = "";

    // Nhóm thuật toán tĩnh theo uninformed/informed; bỏ qua nhóm đối kháng
    // (đã có select riêng trong HTML).
    const groups = { uninformed: [], informed: [] };
    for (const a of algorithms) {
      this._algoInfo[a.key] = a;
      if (a.group === "uninformed" || a.group === "informed") {
        groups[a.group].push(a);
      }
    }

    const groupLabel = { uninformed: "Tìm kiếm mù", informed: "Tìm kiếm có thông tin" };
    for (const g of ["uninformed", "informed"]) {
      if (!groups[g].length) continue;
      const og = document.createElement("optgroup");
      og.label = groupLabel[g];
      for (const a of groups[g]) {
        const opt = document.createElement("option");
        opt.value = a.key;
        opt.textContent = a.name;
        og.appendChild(opt);
      }
      staticSel.appendChild(og);
    }

    // Heuristic.
    const hSel = this.el.heuristicSelect;
    hSel.innerHTML = "";
    for (const h of heuristics) {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = h;
      hSel.appendChild(opt);
    }

    this._applyHeuristicVisibility();
  },

  // Ẩn hàng heuristic nếu thuật toán hiện tại không dùng heuristic.
  _applyHeuristicVisibility() {
    const key = this.el.algoSelect.value;
    const usesH = this._algoInfo[key] && this._algoInfo[key].uses_heuristic;
    this.el.heuristicRow.classList.toggle("hidden", !usesH);
  },

  // Hiện khối điều khiển theo chế độ.
  _applyMode() {
    const mode = this.el.modeSelect.value;
    const isStatic = mode === "static";
    this.el.staticControls.classList.toggle("hidden", !isStatic);
    this.el.adversarialControls.classList.toggle("hidden", isStatic);
  },

  // --- Getter cấu hình hiện tại ---
  mode() {
    return this.el.modeSelect.value; // "static" | "adversarial"
  },

  config() {
    return {
      map: this.el.mapSelect.value,
      mode: this.mode(),
      problem: this.el.problemSelect.value,
      algorithm: this.el.algoSelect.value,
      heuristic: this.el.heuristicSelect.value,
      advAlgorithm: this.el.advAlgoSelect.value,
      depth: parseInt(this.el.depthRange.value, 10),
      speed: parseInt(this.el.speedRange.value, 10),
    };
  },

  // Độ trễ mỗi bước animation (ms) suy từ tốc độ (bước/giây).
  stepDelay() {
    const sps = Math.max(1, parseInt(this.el.speedRange.value, 10));
    return Math.round(1000 / sps);
  },

  // --- Cập nhật hiển thị ---
  setStatus(text) {
    this.el.stStatus.textContent = text;
  },

  // Hiển thị thống kê của 1 lần solve tĩnh.
  showStaticStats(stats, status) {
    const d = (v) => (v === undefined || v === null ? "—" : v);
    this.el.stStatus.textContent = status ?? "—";
    if (!stats) {
      for (const k of ["stExpanded", "stGenerated", "stFrontier", "stTime", "stPath", "stCost"]) {
        this.el[k].textContent = "—";
      }
      this.el.stScore.textContent = "—";
      return;
    }
    this.el.stExpanded.textContent = d(stats.nodes_expanded);
    this.el.stGenerated.textContent = d(stats.nodes_generated);
    this.el.stFrontier.textContent = d(stats.max_frontier);
    this.el.stTime.textContent = d(stats.time_ms);
    this.el.stPath.textContent = d(stats.path_length);
    this.el.stCost.textContent = d(stats.cost);
    this.el.stScore.textContent = "—";
  },

  // Hiển thị thống kê của chế độ đối kháng.
  showAdversarialStats(stats) {
    const d = (v) => (v === undefined || v === null ? "—" : v);
    this.el.stStatus.textContent = d(stats.status);
    this.el.stExpanded.textContent = d(stats.nodes_expanded);
    this.el.stGenerated.textContent = "—";
    this.el.stFrontier.textContent = "—";
    this.el.stTime.textContent = d(stats.time_ms);
    this.el.stPath.textContent = d(stats.steps) + " bước";
    this.el.stCost.textContent = "—";
    this.el.stScore.textContent = d(stats.final_score);
  },

  clearStats() {
    for (const k of ["stStatus", "stExpanded", "stGenerated", "stFrontier", "stTime", "stPath", "stCost", "stScore"]) {
      this.el[k].textContent = "—";
    }
  },

  // Đổ bảng so sánh từ kết quả POST /compare.
  showCompare(results) {
    const tbody = this.el.compareTable.querySelector("tbody");
    tbody.innerHTML = "";
    for (const row of results) {
      const tr = document.createElement("tr");
      const name = (this._algoInfo[row.algorithm] && this._algoInfo[row.algorithm].name) || row.algorithm;
      if (row.error) {
        tr.innerHTML = `<td>${name}</td><td colspan="4" class="err">${row.error}</td>`;
      } else {
        const s = row.stats || {};
        tr.innerHTML =
          `<td>${name}</td>` +
          `<td>${s.nodes_expanded ?? "—"}</td>` +
          `<td>${s.time_ms ?? "—"}</td>` +
          `<td>${s.path_length ?? "—"}</td>` +
          `<td>${s.cost ?? "—"}</td>`;
      }
      tbody.appendChild(tr);
    }
  },

  clearCompare() {
    this.el.compareTable.querySelector("tbody").innerHTML = "";
  },

  // Bật/tắt nút khi đang chạy để tránh thao tác chồng chéo.
  setBusy(busy) {
    this.el.runBtn.disabled = busy;
    this.el.compareBtn.disabled = busy;
    this.el.stepBtn.disabled = busy;
    this.el.mapSelect.disabled = busy;
    this.el.modeSelect.disabled = busy;
  },
};
