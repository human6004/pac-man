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
  const visitedStepRef = useRef(0);

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
      visitedStepRef.current = 0;
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
    visitedStepRef.current = 0;
    setStats(null);
    setScoreStat(null);
    setCompareRows([]);
    setCompareMap(null);
    setTree([]);
    setStatus("Đã đặt lại");
  }, [rendererRef, stopAnimation]);

  const stepStatic = useCallback(
    async (cfg) => {
      const r = rendererRef.current;
      // Lần Step đầu: gọi solve, KHÔNG lộ hết visited — để reveal từng node.
      if (!lastSolveRef.current) {
        setBusy(true);
        try {
          const result = await Api.solve({
            map: cfg.map,
            algorithm: cfg.algorithm,
            heuristic: cfg.heuristic,
            problem: cfg.problem,
          });
          lastSolveRef.current = result;
          stepIndexRef.current = 0;
          visitedStepRef.current = 0;
          setTree(result.tree || []);
          r.reset();
          r.visited = [];
          r.path = [];
          r.draw();
          setStats(result.stats);
          setStatus(
            result.found
              ? "Đã giải — bấm Step để xem từng node expand"
              : "Không tìm thấy"
          );
        } finally {
          setBusy(false);
        }
        return;
      }

      const solve = lastSolveRef.current;
      const visited = solve.visited_order || [];

      // Pha 1: reveal từng node đã expand.
      if (visitedStepRef.current < visited.length) {
        const vi = visitedStepRef.current;
        r.visited = visited.slice(0, vi + 1);
        r.draw();
        visitedStepRef.current++;
        setStatus(`Expand node ${visitedStepRef.current}/${visited.length}`);
        return;
      }

      // Pha 2: đi dọc đường đi lời giải.
      const path = solve.path;
      const idx = stepIndexRef.current;
      if (!path || idx >= path.length) {
        setStatus("Đã đi hết đường");
        return;
      }
      r.path = path.slice(0, idx + 1);
      const cur = path[idx];
      if (idx > 0) {
        const prev = path[idx - 1];
        r.setPacman(cur, r._dirOf(prev, cur));
        r.food.delete(r._key(cur));
        r.pellets.delete(r._key(cur));
      } else {
        r.setPacman(cur, "RIGHT");
      }
      r._mouthPhase += 0.9;
      r.draw();
      audio.eat();
      stepIndexRef.current++;
      setStatus(`Bước ${stepIndexRef.current}/${path.length}`);
    },
    [rendererRef]
  );

  const stepAdversarial = useCallback(() => {
    const r = rendererRef.current;
    const frames = lastFramesRef.current;
    if (!frames) {
      setStatus("Bấm Chạy trước để mô phỏng, rồi mới đi từng bước");
      return;
    }
    if (stepIndexRef.current >= frames.length) {
      setStatus("Đã hết frame");
      return;
    }
    r.setState(frames[stepIndexRef.current]);
    r.draw();
    stepIndexRef.current++;
    setStatus(`Frame ${stepIndexRef.current}/${frames.length}`);
  }, [rendererRef]);

  const step = useCallback(
    async (cfg) => {
      if (cfg.mode === "static") await stepStatic(cfg);
      else stepAdversarial();
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
