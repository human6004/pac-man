// ComparisonView.jsx — Hiển thị N maze cạnh nhau, mỗi thuật toán 1 canvas.
//
// Nhận rows từ /compare (mỗi row có visited_order + path + stats) và mapData.
// Số card tự scale: 1 -> 1 cột, 2 -> 2 cột, >=3 -> lưới tự co. Dùng lại
// PacmanRenderer (imperative) cho mỗi canvas mini.

import { useEffect, useRef } from "react";
import { PacmanRenderer } from "../game/PacmanRenderer";

function MiniMaze({ row, mapData, algoInfo }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;
    const r = new PacmanRenderer(canvas);
    r.setMap(mapData);
    r.visited = (row.visited_order || []).slice();
    r.path = (row.path || []).slice();
    // Đặt Pac-man ở cuối đường đi (nếu có) cho khớp trạng thái cuối.
    if (row.path && row.path.length) {
      r.pacman = row.path[row.path.length - 1].slice();
    }
    r.draw();
  }, [row, mapData]);

  const name = algoInfo?.[row.algorithm]?.name || row.algorithm;
  const s = row.stats || {};

  return (
    <div className="crt-panel p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="crt-label" style={{ color: "var(--color-pac)" }}>{name}</span>
        <span className="crt-label text-[13px]">
          Nodes: {s.nodes_expanded ?? "—"} · {s.time_ms ?? "—"}ms
        </span>
      </div>
      <canvas ref={canvasRef} width={320} height={240} className="w-full rounded" />
    </div>
  );
}

function QuickStats({ rows, algoInfo }) {
  const valid = rows.filter((r) => !r.error && r.stats);
  if (!valid.length) return null;
  const nameOf = (r) => algoInfo?.[r.algorithm]?.name || r.algorithm;
  const minBy = (key) =>
    valid.reduce((a, b) => ((b.stats[key] ?? Infinity) < (a.stats[key] ?? Infinity) ? b : a));

  const fastest = minBy("time_ms");
  const efficient = minBy("nodes_expanded");
  const leastMem = minBy("memory_kb");

  const Item = ({ label, r, unit, statKey }) => (
    <div>
      <div className="crt-label text-[13px]">{label}</div>
      <div className="font-term text-[20px]" style={{ color: "var(--color-pac)" }}>
        {nameOf(r)} ({r.stats[statKey]}{unit})
      </div>
    </div>
  );

  return (
    <div className="crt-panel p-4 flex flex-col gap-3">
      <h2 className="crt-label">◢ Quick Stats</h2>
      <Item label="Nhanh nhất" r={fastest} unit="ms" statKey="time_ms" />
      <Item label="Ít node nhất" r={efficient} unit=" nodes" statKey="nodes_expanded" />
      <Item label="Ít bộ nhớ nhất" r={leastMem} unit=" KB" statKey="memory_kb" />
    </div>
  );
}

export function ComparisonView({ rows, mapData, algoInfo }) {
  if (!rows || rows.length === 0 || !mapData) return null;

  const cols = rows.length <= 1 ? "grid-cols-1" : rows.length === 2 ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px] items-start">
      <div>
        <h2 className="crt-label mb-3">◢ So sánh trực quan ({rows.length} maze)</h2>
        <div className={`grid gap-3 ${cols}`}>
          {rows.map((r) => (
            <MiniMaze key={r.algorithm} row={r} mapData={mapData} algoInfo={algoInfo} />
          ))}
        </div>
      </div>
      <QuickStats rows={rows} algoInfo={algoInfo} />
    </div>
  );
}
