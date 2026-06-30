// ControlDeck.jsx — Bảng điều khiển kiểu nút bấm arcade.
//
// Quản lý toàn bộ lựa chọn cấu hình (controlled inputs) và phát ra qua onChange.
// Config shape khớp với useRunner: {map, mode, problem, algorithm, heuristic,
// advAlgorithm, depth, speed}.

const ADV_ALGOS = [
  { key: "alphabeta", name: "Alpha-Beta" },
  { key: "minimax", name: "Minimax" },
  { key: "expectimax", name: "Expectimax" },
];

const GROUP_LABEL = { uninformed: "Tìm kiếm mù", informed: "Tìm kiếm có thông tin" };

export function ControlDeck({
  maps,
  algorithms,
  heuristics,
  algoInfo,
  cfg,
  setCfg,
  busy,
  paused,
  soundOn,
  onToggleSound,
  onRun,
  onPause,
  onStep,
  onReset,
  onCompare,
}) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const isStatic = cfg.mode === "static";
  const usesHeuristic = isStatic && algoInfo?.[cfg.algorithm]?.uses_heuristic;

  // Nhóm thuật toán tĩnh theo uninformed/informed.
  const groups = { uninformed: [], informed: [] };
  for (const a of algorithms) {
    if (a.group === "uninformed" || a.group === "informed") groups[a.group].push(a);
  }

  return (
    <div className="crt-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="crt-label">◢ Insert Coin</h2>
        <button
          className="font-term text-[18px] leading-none px-2 py-1 rounded border"
          style={{
            color: soundOn ? "var(--color-pac)" : "var(--color-amber-dim)",
            borderColor: "rgba(255,176,0,.35)",
          }}
          onClick={onToggleSound}
          title="Bật/tắt âm thanh"
        >
          {soundOn ? "🔊 ON" : "🔇 OFF"}
        </button>
      </div>

      <Field label="Bản đồ">
        <select className="crt-select" value={cfg.map} disabled={busy}
          onChange={(e) => set({ map: e.target.value })}>
          {maps.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>

      <Field label="Chế độ">
        <select className="crt-select" value={cfg.mode} disabled={busy}
          onChange={(e) => set({ mode: e.target.value })}>
          <option value="static">Tĩnh (tìm đường / ăn hết food)</option>
          <option value="adversarial">Đối kháng (có ma)</option>
        </select>
      </Field>

      {isStatic ? (
        <>
          <Field label="Bài toán">
            <select className="crt-select" value={cfg.problem} disabled={busy}
              onChange={(e) => set({ problem: e.target.value })}>
              <option value="eat_all">Ăn hết food</option>
              <option value="path_to_nearest">Đi tới food gần nhất</option>
            </select>
          </Field>
          <Field label="Thuật toán">
            <select className="crt-select" value={cfg.algorithm} disabled={busy}
              onChange={(e) => set({ algorithm: e.target.value })}>
              {["uninformed", "informed"].map((g) =>
                groups[g].length ? (
                  <optgroup key={g} label={GROUP_LABEL[g]}>
                    {groups[g].map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
                  </optgroup>
                ) : null
              )}
            </select>
          </Field>
          {usesHeuristic && (
            <Field label="Heuristic">
              <select className="crt-select" value={cfg.heuristic} disabled={busy}
                onChange={(e) => set({ heuristic: e.target.value })}>
                {heuristics.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
          )}
        </>
      ) : (
        <>
          <Field label="Thuật toán">
            <select className="crt-select" value={cfg.advAlgorithm} disabled={busy}
              onChange={(e) => set({ advAlgorithm: e.target.value })}>
              {ADV_ALGOS.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          </Field>
          <Field label={`Độ sâu (depth): ${cfg.depth}`}>
            <input type="range" className="crt-range" min={1} max={6} value={cfg.depth} disabled={busy}
              onChange={(e) => set({ depth: parseInt(e.target.value, 10) })} />
          </Field>
        </>
      )}

      <Field label={`Tốc độ: ${cfg.speed} bước/giây`}>
        <input type="range" className="crt-range" min={1} max={60} value={cfg.speed}
          onChange={(e) => set({ speed: parseInt(e.target.value, 10) })} />
      </Field>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <button className="arcade-btn btn-run" disabled={busy} onClick={onRun}>▶ Run</button>
        <button className="arcade-btn btn-pause" disabled={!busy} onClick={onPause}>
          {paused ? "▶ Tiếp" : "‖ Pause"}
        </button>
        <button className="arcade-btn btn-step" disabled={busy} onClick={onStep}>⇥ Step</button>
        <button className="arcade-btn btn-reset" disabled={busy} onClick={onReset}>↻ Reset</button>
      </div>
      <button className="arcade-btn btn-compare" disabled={busy} onClick={onCompare}>
        ⊞ So sánh tất cả
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="crt-label block mb-1">{label}</span>
      {children}
    </label>
  );
}
