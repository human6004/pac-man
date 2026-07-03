// useRunner.js — Máy điều phối chạy thuật toán (port từ game.js bản vanilla).
//
// Nhận một ref tới PacmanRenderer. Cung cấp run/pause/step/reset/compare cho cả
// 2 chế độ (tĩnh & đối kháng) + state hiển thị (status, stats, compareRows, busy).
//
// Renderer chạy imperative (không re-render qua React) để animation mượt; hook
// chỉ giữ các state cần hiển thị trên panel.

import { useCallback, useRef, useState } from "react";
import { Api } from "../api/client";
import { audio } from "../sound/audio";
import { effects } from "../game/effects";

export function useRunner(rendererRef, onLose) {
  const [status, setStatus] = useState("Sẵn sàng");
  const [stats, setStats] = useState(null);     // {nodes_expanded, time_ms, ...}
  const [scoreStat, setScoreStat] = useState(null);
  const [compareRows, setCompareRows] = useState([]);
  const [compareMap, setCompareMap] = useState(null);
  const [tree, setTree] = useState([]);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);

  // Cờ điều khiển animation (ref để không gây re-render).
  const stopRef = useRef(false);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);

  // Lưu kết quả lần chạy gần nhất cho chế độ "Từng bước".
  const lastSolveRef = useRef(null);
  const lastFramesRef = useRef(null);
  const stepIndexRef = useRef(0);
  // Bộ đếm tổng số bước đã đi (tất định) cho step tới/lui ở chế độ tĩnh.
  const staticStepRef = useRef(0);

  const stepDelay = useCallback((speed) => {
    const sps = Math.max(1, speed || 12);
    return Math.round(1000 / sps);
  }, []);

  const shouldStop = useCallback(() => stopRef.current, []);

  const stopAnimation = useCallback(() => {
    stopRef.current = true;
    pausedRef.current = false;
    runningRef.current = false;
    setPaused(false);
  }, []);

  // Gắn hook hiệu ứng ăn food vào renderer (gọi 1 lần khi có renderer).
  const wireRenderer = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.onEat = (cx, cy, isPellet) => {
      effects.spawnBurst(cx, cy, isPellet ? "#FFF04D" : "#FFE600", isPellet ? 14 : 8);
      if (isPellet) audio.pellet();
      else audio.eat();
    };
  }, [rendererRef]);

  // ---- Chạy chế độ tĩnh ----
  const runStatic = useCallback(
    async (cfg) => {
      const r = rendererRef.current;
      setStatus("Đang chạy " + cfg.algorithm + "...");
      const result = await Api.solve({
        map: cfg.map,
        algorithm: cfg.algorithm,
        heuristic: cfg.heuristic,
        problem: cfg.problem,
      });
      lastSolveRef.current = result;
      stepIndexRef.current = 0;
      setTree(result.tree || []);

      if (!result.found) {
        setStats(result.stats);
        setScoreStat(null);
        setStatus("Không tìm thấy lời giải");
        r.visited = result.visited_order.slice();
        r.draw();
        return;
      }

      const delay = stepDelay(cfg.speed);
      await r.animateSearch(
        result.visited_order,
        result.path,
        Math.max(4, delay / 4),
        shouldStop
      );
      if (shouldStop()) return;
      await r.animatePath(result.path, delay, shouldStop);

      setStats(result.stats);
      setScoreStat(null);
      setStatus("Hoàn tất");
      audio.win();
    },
    [rendererRef, shouldStop, stepDelay]
  );

  // ---- Chạy chế độ đối kháng ----
  const playFrames = useCallback(
    (frames, delay) =>
      new Promise((resolve) => {
        const r = rendererRef.current;
        let i = 0;
        const tick = () => {
          if (shouldStop()) return resolve();
          if (pausedRef.current) {
            setTimeout(tick, 60);
            return;
          }
          if (i >= frames.length) return resolve();
          r.setState(frames[i]);
          r.draw();
          stepIndexRef.current = i;
          i++;
          setTimeout(tick, delay);
        };
        tick();
      }),
    [rendererRef, shouldStop]
  );

  const runAdversarial = useCallback(
    async (cfg) => {
      setStatus("Đang mô phỏng " + cfg.advAlgorithm + "...");
      const result = await Api.adversarial({
        map: cfg.map,
        algorithm: cfg.advAlgorithm,
        depth: cfg.depth,
        max_steps: 200,
      });
      lastFramesRef.current = result.frames;
      stepIndexRef.current = 0;

      const delay = stepDelay(cfg.speed);
      await playFrames(result.frames, delay);

      setStats({
        nodes_expanded: result.stats.nodes_expanded,
        time_ms: result.stats.time_ms,
        path_length: result.stats.steps,
        cost: null,
        nodes_generated: null,
        max_frontier: null,
      });
      setScoreStat(result.stats.final_score);
      setStatus(result.stats.status === "win" ? "THẮNG" : result.stats.status === "lose" ? "THUA" : "Hết bước");
      if (result.stats.status === "win") audio.win();
      else if (result.stats.status === "lose") {
        audio.lose();
        effects.shake(10);
        onLose && onLose();
      }
    },
    [stepDelay, playFrames, onLose]
  );

  // ---- Các hành động công khai ----
  const run = useCallback(
    async (cfg) => {
      if (runningRef.current) return;
      const r = rendererRef.current;
      if (!r) return;
      wireRenderer();
      r.reset();
      effects.clear();
      stopRef.current = false;
      runningRef.current = true;
      staticStepRef.current = 0;
      setBusy(true);
      setCompareRows([]);
      audio.start();
      try {
        if (cfg.mode === "static") await runStatic(cfg);
        else await runAdversarial(cfg);
      } catch (e) {
        setStatus("Lỗi: " + e.message);
        console.error(e);
      } finally {
        runningRef.current = false;
        setBusy(false);
      }
    },
    [rendererRef, wireRenderer, runStatic, runAdversarial]
  );

  const pause = useCallback(() => {
    if (!runningRef.current) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    setStatus(pausedRef.current ? "Tạm dừng" : "Đang chạy...");
  }, []);

  const reset = useCallback(() => {
    stopAnimation();
    const r = rendererRef.current;
    if (r) r.reset();
    effects.clear();
    lastSolveRef.current = null;
    lastFramesRef.current = null;
    stepIndexRef.current = 0;
    staticStepRef.current = 0;
    setStats(null);
    setScoreStat(null);
    setCompareRows([]);
    setCompareMap(null);
    setTree([]);
    setStatus("Đã đặt lại");
  }, [rendererRef, stopAnimation]);

  // Vẽ lại trạng thái tĩnh TẤT ĐỊNH tại một bước cụ thể (dùng cho tới/lui).
  // step trong [0, visited.length + path.length]:
  //   0..visited.length     -> pha reveal node đã expand
  //   >visited.length        -> pha đi dọc path
  const renderStaticAt = useCallback(
    (step) => {
      const r = rendererRef.current;
      const solve = lastSolveRef.current;
      if (!r || !solve) return;
      const visited = solve.visited_order || [];
      const path = solve.path || [];
      const total = visited.length + path.length;
      const s = Math.max(0, Math.min(step, total));
      staticStepRef.current = s;

      // Dựng lại từ đầu để lùi được (food/pellet reset về ban đầu).
      r.reset();

      if (s <= visited.length) {
        // Pha 1: hé lộ node expand, chưa đi.
        r.visited = visited.slice(0, s);
        r.path = [];
        r.draw();
        setStatus(s === 0 ? "Bắt đầu" : `Expand node ${s}/${visited.length}`);
        return;
      }

      // Pha 2: đã expand hết, đi dọc path tới ô thứ (walk).
      const walk = s - visited.length; // số ô path đã đi (1..path.length)
      r.visited = visited.slice();
      r.path = path.slice(0, walk);
      const idx = walk - 1;
      const cur = path[idx];
      // Ăn food/pellet dọc các ô đã đi qua.
      for (let i = 1; i <= idx; i++) {
        r.food.delete(r._key(path[i]));
        r.pellets.delete(r._key(path[i]));
      }
      const dir = idx > 0 ? r._dirOf(path[idx - 1], cur) : "RIGHT";
      r.setPacman(cur, dir);
      r._mouthPhase += 0.9;
      r.draw();
      setStatus(`Bước ${walk}/${path.length}`);
    },
    [rendererRef]
  );

  const stepStatic = useCallback(
    async (cfg, dir = 1) => {
      const r = rendererRef.current;
      // Lần đầu (chưa solve): gọi API, dựng cây, đứng ở bước 0.
      if (!lastSolveRef.current) {
        if (dir < 0) return; // chưa có gì để lùi
        setBusy(true);
        try {
          const result = await Api.solve({
            map: cfg.map,
            algorithm: cfg.algorithm,
            heuristic: cfg.heuristic,
            problem: cfg.problem,
          });
          lastSolveRef.current = result;
          staticStepRef.current = 0;
          setTree(result.tree || []);
          r.reset();
          if (!result.found) {
            setStats(result.stats);
            setStatus("Không tìm thấy");
            return;
          }
          setStats(result.stats);
          setStatus("Đã giải — bấm Bước tiếp để xem từng node expand");
        } finally {
          setBusy(false);
        }
        return;
      }

      const solve = lastSolveRef.current;
      const total = (solve.visited_order || []).length + (solve.path || []).length;
      const next = staticStepRef.current + dir;
      if (next < 0) {
        setStatus("Đã ở bước đầu");
        return;
      }
      if (next > total) {
        setStatus("Đã đi hết đường");
        return;
      }
      renderStaticAt(next);
      if (dir > 0 && next > (solve.visited_order || []).length) audio.eat();
    },
    [rendererRef, renderStaticAt]
  );

  const stepAdversarial = useCallback(
    async (cfg, dir = 1) => {
      const r = rendererRef.current;
      // Lần đầu (chưa mô phỏng): gọi API lấy frames, đứng ở frame 0.
      if (!lastFramesRef.current) {
        if (dir < 0) return;
        setBusy(true);
        try {
          const result = await Api.adversarial({
            map: cfg.map,
            algorithm: cfg.advAlgorithm,
            depth: cfg.depth,
            max_steps: 200,
          });
          lastFramesRef.current = result.frames;
          stepIndexRef.current = 0;
          r.setState(result.frames[0]);
          r.draw();
          setStatus(`Frame 1/${result.frames.length} — bấm Bước tiếp (ma đi theo)`);
        } finally {
          setBusy(false);
        }
        return;
      }

      const frames = lastFramesRef.current;
      const next = stepIndexRef.current + dir;
      if (next < 0) {
        setStatus("Đã ở frame đầu");
        return;
      }
      if (next >= frames.length) {
        setStatus("Đã hết frame");
        return;
      }
      // setState mỗi frame cập nhật CẢ Pac-man LẪN ma -> ma đi theo từng bước.
      r.setState(frames[next]);
      r.draw();
      stepIndexRef.current = next;
      setStatus(`Frame ${next + 1}/${frames.length}`);
    },
    [rendererRef]
  );

  const step = useCallback(
    async (cfg, dir = 1) => {
      if (cfg.mode === "static") await stepStatic(cfg, dir);
      else await stepAdversarial(cfg, dir);
    },
    [stepStatic, stepAdversarial]
  );

  const compare = useCallback(async (cfg) => {
    const algos =
      cfg.compareAlgos && cfg.compareAlgos.length
        ? cfg.compareAlgos
        : ["bfs", "dfs", "ucs", "ids", "greedy", "astar"];
    setBusy(true);
    setStatus("Đang so sánh " + algos.length + " thuật toán...");
    try {
      const result = await Api.compare({
        map: cfg.map,
        algorithms: algos,
        heuristic: cfg.heuristic,
        problem: cfg.problem,
      });
      setCompareRows(result.results);
      setCompareMap(result.map);
      setStatus("So sánh xong");
    } catch (e) {
      setStatus("Lỗi so sánh: " + e.message);
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status, stats, scoreStat, compareRows, compareMap, tree, busy, paused,
    run, pause, step, reset, compare, stopAnimation, setStatus,
  };
}
