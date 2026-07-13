const GROUP_LABEL = {
  uninformed: "Tìm kiếm không thông tin",
  informed: "Tìm kiếm có thông tin",
};

const HEURISTIC_LABEL = {
  null: "Không dùng",
  manhattan: "Khoảng cách Manhattan",
  nearest_food: "Thức ăn gần nhất",
  farthest_food: "Thức ăn xa nhất",
  food_count: "Số thức ăn còn lại",
};

function problemPatch(problem) {
  return {
    problem,
    heuristic: problem === "eat_all" ? "farthest_food" : "manhattan",
    goal: null,
  };
}

function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function PlaybackDock({
  cfg,
  busy,
  paused,
  progress,
  onRun,
  onPause,
  onStep,
  onStepBack,
  canStepBack,
  canStepNext,
  onReset,
}) {
  const auto = cfg.runMode !== "step";
  const primaryAction = auto && busy ? onPause : auto ? onRun : onStep;
  const primaryLabel = auto && busy ? (paused ? "Tiếp tục" : "Tạm dừng") : auto ? "Bắt đầu" : "Bước tiếp";
  const primaryDisabled = auto ? (!busy && !onRun) : (busy || !canStepNext || !onStep);

  return (
    <section className="playback-dock" aria-label="Điều khiển mô phỏng">
      <div className="playback-progress" aria-live="polite">
        <span>Tiến độ</span>
        <strong>{progress?.step ?? 0}/{progress?.total ?? 0}</strong>
      </div>
      <div className="playback-actions">
        <button className="button secondary" disabled={busy || !canStepBack || !onStepBack} onClick={onStepBack}>
          Lùi bước
        </button>
        <button className="button primary" disabled={primaryDisabled} onClick={primaryAction}>
          {primaryLabel}
        </button>
        <button className={`button ${busy ? "danger" : "ghost"}`} disabled={!onReset} onClick={onReset}>
          {busy ? "Dừng" : "Đặt lại"}
        </button>
      </div>
    </section>
  );
}

export function ControlDeck({
  tab = "play",
  section = "all",
  maps = [],
  algorithms = [],
  heuristics = [],
  algoInfo = {},
  cfg,
  setCfg,
  busy,
  paused,
  progress,
  canStepBack,
  canStepNext,
  onRun,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onCompare,
  onProblemChange,
}) {
  const set = (patch, resetCached = false) => {
    if (resetCached) onReset?.();
    setCfg((current) => ({ ...current, ...patch }));
  };
  const groups = { uninformed: [], informed: [] };
  algorithms.forEach((algorithm) => groups[algorithm.group]?.push(algorithm));

  if (section === "run" || section === "compare-playback") {
    return (
      <PlaybackDock
        cfg={cfg}
        busy={busy}
        paused={paused}
        progress={progress}
        onRun={onRun}
        onPause={onPause}
        onStep={onStep}
        onStepBack={onStepBack}
        canStepBack={canStepBack}
        canStepNext={canStepNext}
        onReset={onReset}
      />
    );
  }

  if (tab === "compare") {
    const selected = cfg.compareAlgos || [];
    const compareUsesHeuristic = selected.some((key) => algoInfo[key]?.uses_heuristic);
    const validSelection = selected.length >= 2 && selected.length <= 5;
    const allSelected = algorithms.length > 0 && selected.length === algorithms.length;

    return (
      <section className="lab-panel compare-config" aria-labelledby="compare-config-title">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Thiết lập phép thử</p>
            <h2 id="compare-config-title">Chọn thuật toán</h2>
          </div>
          <button
            type="button"
            className="button ghost compact"
            disabled={busy}
            onClick={() => set({ compareAlgos: allSelected ? [] : algorithms.map((algorithm) => algorithm.key) }, true)}
          >
            {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
          </button>
        </div>

        <div className="config-grid compare-fields">
          <Field label="Bản đồ">
            <select value={cfg.map} disabled={busy} onChange={(event) => {
              onProblemChange?.();
              set({ map: event.target.value, goal: null }, true);
            }}>
              {maps.map((map) => <option key={map} value={map}>{map}</option>)}
            </select>
          </Field>
          <Field label="Bài toán">
            <select value={cfg.problem} disabled={busy} onChange={(event) => {
              onProblemChange?.(event.target.value);
              set(problemPatch(event.target.value), true);
            }}>
              <option value="eat_all">Ăn hết thức ăn</option>
              <option value="path_to_cell">Đi đến ô đã chọn</option>
            </select>
          </Field>
          {compareUsesHeuristic && (
            <Field label="Heuristic">
              <select value={cfg.heuristic} disabled={busy} onChange={(event) => set({ heuristic: event.target.value }, true)}>
                {heuristics.map((heuristic) => <option key={heuristic} value={heuristic}>{HEURISTIC_LABEL[heuristic] || heuristic}</option>)}
              </select>
            </Field>
          )}
          <Field label="Đích so sánh" hint={cfg.problem === "path_to_cell" ? "Đích đang dùng cho mọi thuật toán." : "So sánh trên cùng toàn bộ thức ăn."}>
            <output className="field-output">
              {cfg.problem === "eat_all" ? "Toàn bộ thức ăn" : cfg.goal ? `(${cfg.goal[0]}, ${cfg.goal[1]})` : "Mặc định: ô xa nhất"}
            </output>
          </Field>
        </div>

        <fieldset className="algorithm-picker">
          <legend>Thuật toán cần so sánh</legend>
          <div>
            {algorithms.map((algorithm) => {
              const checked = selected.includes(algorithm.key);
              return (
                <label key={algorithm.key} className={checked ? "is-selected" : ""}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) next.add(algorithm.key);
                      else next.delete(algorithm.key);
                      set({ compareAlgos: [...next] }, true);
                    }}
                  />
                  <span>{algorithm.name}</span>
                  <small>{GROUP_LABEL[algorithm.group]}</small>
                </label>
              );
            })}
          </div>
        </fieldset>

        {!validSelection && <p className="field-error" role="alert">Chọn từ 2 đến 5 thuật toán.</p>}
        <div className="compare-submit-row">
          <button className="button primary compare-submit" disabled={busy || !validSelection} onClick={onCompare}>
            {busy ? "Đang so sánh" : `Chạy so sánh ${selected.length} thuật toán`}
          </button>
          {busy && <button className="button danger" onClick={onReset}>Dừng</button>}
        </div>
      </section>
    );
  }

  const configLocked = busy || (cfg.runMode === "step" && canStepBack);
  const usesHeuristic = algoInfo?.[cfg.algorithm]?.uses_heuristic;

  return (
    <section className="lab-panel experiment-bar" aria-labelledby="experiment-title" aria-disabled={configLocked}>
      <div className="panel-heading compact-heading">
        <div>
          <p className="section-kicker">Thiết lập thí nghiệm</p>
          <h2 id="experiment-title">Cấu hình tìm kiếm</h2>
        </div>
        {configLocked && <span className="status-note">Đặt lại để đổi cấu hình</span>}
      </div>
      <div className="config-grid">
        <Field label="Bản đồ">
          <select value={cfg.map} disabled={configLocked} onChange={(event) => {
            onProblemChange?.();
            set({ map: event.target.value, goal: null }, true);
          }}>
            {maps.map((map) => <option key={map} value={map}>{map}</option>)}
          </select>
        </Field>
        <Field label="Bài toán">
          <select value={cfg.problem} disabled={configLocked} onChange={(event) => {
            onProblemChange?.(event.target.value);
            set(problemPatch(event.target.value), true);
          }}>
            <option value="eat_all">Ăn hết thức ăn</option>
            <option value="path_to_cell">Đi đến ô đã chọn</option>
          </select>
        </Field>
        <Field label="Thuật toán">
          <select value={cfg.algorithm} disabled={configLocked} onChange={(event) => set({ algorithm: event.target.value }, true)}>
            {["uninformed", "informed"].map((group) => groups[group].length ? (
              <optgroup key={group} label={GROUP_LABEL[group]}>
                {groups[group].map((algorithm) => <option key={algorithm.key} value={algorithm.key}>{algorithm.name}</option>)}
              </optgroup>
            ) : null)}
          </select>
        </Field>
        {usesHeuristic && (
          <Field label="Heuristic">
            <select value={cfg.heuristic} disabled={configLocked} onChange={(event) => set({ heuristic: event.target.value }, true)}>
              {heuristics.map((heuristic) => <option key={heuristic} value={heuristic}>{HEURISTIC_LABEL[heuristic] || heuristic}</option>)}
            </select>
          </Field>
        )}
        <Field label="Đích" hint={cfg.problem === "path_to_cell" ? "Click bản đồ hoặc dùng phím mũi tên rồi Enter." : "Bài toán kết thúc khi hết thức ăn."}>
          <output className="field-output">
            {cfg.problem === "eat_all" ? "Toàn bộ thức ăn" : cfg.goal ? `(${cfg.goal[0]}, ${cfg.goal[1]})` : "Mặc định: ô xa nhất"}
          </output>
        </Field>
        <div className="field">
          <span id="run-mode-label">Chế độ chạy</span>
          <div className="segmented" role="group" aria-labelledby="run-mode-label">
            <button type="button" aria-pressed={cfg.runMode !== "step"} disabled={configLocked} onClick={() => set({ runMode: "auto" })}>Tự động</button>
            <button type="button" aria-pressed={cfg.runMode === "step"} disabled={configLocked} onClick={() => set({ runMode: "step" })}>Từng bước</button>
          </div>
        </div>
        {cfg.runMode !== "step" && (
          <Field label={`Tốc độ: ${cfg.speed} bước/giây`}>
            <input type="range" min="1" max="60" value={cfg.speed} disabled={configLocked} onChange={(event) => set({ speed: Number(event.target.value) })} />
          </Field>
        )}
      </div>
    </section>
  );
}
