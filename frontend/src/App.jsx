// App.jsx — Orchestrator chính: nối renderer (canvas) + hooks điều phối + UI.
//
// - Tạo PacmanRenderer trên canvas (qua ref) và giữ trong rendererRef.
// - Vòng lặp requestAnimationFrame: vẽ lại liên tục để hiệu ứng nhấp nháy
//   (pellet, ma sợ, miệng Pac-man) luôn động, đồng thời cập nhật + vẽ particle
//   và áp dụng screen-shake.
// - Nạp bản đồ khi đổi map; điều phối run/pause/step/reset/compare qua useRunner.

import { useCallback, useEffect, useRef, useState } from "react";
import { Cabinet } from "./components/Cabinet";
import { CRTScreen } from "./components/CRTScreen";
import { ControlDeck } from "./components/ControlDeck";
import { StatsPanel } from "./components/StatsPanel";
import { CompareTable } from "./components/CompareTable";
import { ComparisonView } from "./components/ComparisonView";
import { CompareCharts } from "./components/CompareCharts";
import { FghChart } from "./components/FghChart";
import { SearchTreePanel } from "./components/SearchTreePanel";
import { PacmanRenderer } from "./game/PacmanRenderer";
import { effects } from "./game/effects";
import { audio } from "./sound/audio";
import { Api } from "./api/client";
import { useMetadata } from "./hooks/useMetadata";
import { useRunner } from "./hooks/useRunner";

const DEFAULT_CFG = {
  map: "small",
  mode: "static",
  problem: "eat_all",
  algorithm: "astar",
  heuristic: "manhattan",
  advAlgorithm: "alphabeta",
  depth: 3,
  speed: 12,
  runMode: "auto", // "auto" = tự chạy | "step" = bấm từng bước
  compareAlgos: ["astar", "greedy"],
};

export default function App() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const screenWrapRef = useRef(null);

  const meta = useMetadata();
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [soundOn, setSoundOn] = useState(true);
  const [poweron, setPoweron] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [tab, setTab] = useState("play"); // "play" = chạy 1 thuật toán | "compare" = so sánh

  const onLose = useCallback(() => {
    const wrap = screenWrapRef.current;
    if (!wrap) return;
    wrap.classList.remove("shake");
    void wrap.offsetWidth; // reflow để restart animation
    wrap.classList.add("shake");
  }, []);

  const runner = useRunner(rendererRef, onLose);

  // Tạo renderer 1 lần khi canvas sẵn sàng + chạy vòng lặp vẽ.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = new PacmanRenderer(canvas);
    rendererRef.current = r;

    let raf;
    const loop = () => {
      effects.update();
      const [dx, dy] = effects.shakeOffset();
      const ctx = r.ctx;
      ctx.save();
      ctx.translate(dx, dy);
      r.draw();
      effects.draw(ctx);
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Tắt cờ power-on sau khi animation chạy 1 lần.
  useEffect(() => {
    const t = setTimeout(() => setPoweron(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Khi metadata đã nạp, đảm bảo cfg.map hợp lệ (mặc định 'small').
  useEffect(() => {
    if (meta.loading || meta.maps.length === 0) return;
    setCfg((c) => (meta.maps.includes(c.map) ? c : { ...c, map: meta.maps[0] }));
  }, [meta.loading, meta.maps]);

  // Nạp layout mỗi khi đổi bản đồ.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || meta.loading) return;
    let alive = true;
    (async () => {
      try {
        const map = await Api.getMap(cfg.map);
        if (!alive) return;
        r.setMap(map);
        effects.clear();
        runner.reset();
        setMapError(null);
      } catch (e) {
        if (alive) setMapError(e.message);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.map, meta.loading]);

  // Đồng bộ bật/tắt âm thanh.
  useEffect(() => {
    audio.setEnabled(soundOn);
  }, [soundOn]);

  // Bỏ chọn dòng f/g/h khi kết quả so sánh thay đổi (tránh trỏ vào row cũ).
  useEffect(() => {
    setSelectedRow(null);
  }, [runner.compareRows]);

  const handleRun = useCallback(() => runner.run(cfg), [runner, cfg]);
  const handleStep = useCallback(() => runner.step(cfg, 1), [runner, cfg]);
  const handleStepBack = useCallback(() => runner.step(cfg, -1), [runner, cfg]);
  const handleCompare = useCallback(() => runner.compare(cfg), [runner, cfg]);

  const backendError = (meta.error || mapError) && (
    <div className="crt-panel p-3 font-term text-[18px]" style={{ color: "var(--color-clyde)" }}>
      {meta.error
        ? `Không kết nối được backend (${Api.baseUrl}). Hãy chạy: py -3.12 -m uvicorn backend.api.main:app`
        : mapError}
    </div>
  );

  return (
    <Cabinet>
      {/* Thanh tab */}
      <div className="flex gap-2 mb-4">
        <button
          className={`tab-btn ${tab === "play" ? "tab-on" : ""}`}
          onClick={() => setTab("play")}
        >
          ▶ Chạy thuật toán
        </button>
        <button
          className={`tab-btn ${tab === "compare" ? "tab-on" : ""}`}
          onClick={() => setTab("compare")}
        >
          ⊞ So sánh thuật toán
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] items-start">
        {/* Cột nội dung */}
        <div className="flex flex-col gap-4 order-2 lg:order-1">
          {/* Canvas luôn gắn trong DOM (renderer tạo 1 lần); ẩn khi ở tab so sánh. */}
          <div ref={screenWrapRef} className={tab === "play" ? "" : "hidden"}>
            <CRTScreen ref={canvasRef} poweron={poweron} />
          </div>

          {backendError}

          {tab === "play" ? (
            <>
              <StatsPanel
                status={runner.status}
                stats={runner.stats}
                scoreStat={runner.scoreStat}
              />
              <SearchTreePanel
                tree={runner.tree}
                active={cfg.mode === "static" && cfg.problem === "path_to_nearest"}
              />
            </>
          ) : runner.compareRows.length > 0 ? (
            <>
              <ComparisonView
                rows={runner.compareRows}
                mapData={runner.compareMap}
                algoInfo={meta.algoInfo}
              />
              <CompareTable
                rows={runner.compareRows}
                algoInfo={meta.algoInfo}
                onSelectAlgo={setSelectedRow}
                selectedAlgo={selectedRow?.algorithm}
              />
              {selectedRow && <FghChart row={selectedRow} algoInfo={meta.algoInfo} />}
              <CompareCharts rows={runner.compareRows} algoInfo={meta.algoInfo} />
            </>
          ) : (
            <div className="crt-panel p-4 crt-label">
              Chọn các thuật toán bên phải rồi bấm "So sánh" để xem kết quả.
            </div>
          )}
        </div>

        {/* Cột điều khiển */}
        <div className="order-1 lg:order-2">
          <ControlDeck
            tab={tab}
            maps={meta.maps}
            algorithms={meta.algorithms}
            heuristics={meta.heuristics}
            algoInfo={meta.algoInfo}
            cfg={cfg}
            setCfg={setCfg}
            busy={runner.busy}
            paused={runner.paused}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn((s) => !s)}
            onRun={handleRun}
            onPause={runner.pause}
            onStep={handleStep}
            onStepBack={handleStepBack}
            onReset={runner.reset}
            onCompare={handleCompare}
          />
        </div>
      </div>
    </Cabinet>
  );
}
