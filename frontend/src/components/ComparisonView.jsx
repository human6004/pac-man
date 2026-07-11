// ComparisonView.jsx — So sánh cây duyệt của nhiều thuật toán.
//
// Nhận rows từ /compare (mỗi row có tree + stats). Cây là phần chính vì nó
// cho thấy thuật toán khác nhau ở thứ tự mở node và độ rẽ nhánh.

import { useEffect, useRef } from "react";
import { PacmanRenderer } from "../game/PacmanRenderer";
import { SearchTreePreview } from "./SearchTreePanel";

function MiniMaze({ row, mapData, algoInfo }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;
    // Tạo renderer 1 lần cho canvas này, các lần sau chỉ vẽ lại.
    const r = rendererRef.current || (rendererRef.current = new PacmanRenderer(canvas));
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

function QuickStatItem({ label, row, unit, statKey, nameOf }) {
  return (
    <div>
      <div className="crt-label text-[13px]">{label}</div>
      <div className="font-term text-[20px]" style={{ color: "var(--color-pac)" }}>
        {nameOf(row)} ({row.stats[statKey]}{unit})
      </div>
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

  return (
    <div className="crt-panel p-4 flex flex-col gap-3">
      <h2 className="crt-label">◢ Quick Stats</h2>
      <QuickStatItem label="Nhanh nhất" row={fastest} unit="ms" statKey="time_ms" nameOf={nameOf} />
      <QuickStatItem label="Ít node nhất" row={efficient} unit=" nodes" statKey="nodes_expanded" nameOf={nameOf} />
      <QuickStatItem label="Ít bộ nhớ nhất" row={leastMem} unit=" KB" statKey="memory_kb" nameOf={nameOf} />
    </div>
  );
}

export function ComparisonView({ rows, mapData, algoInfo }) {
  if (!rows || rows.length === 0) return null;

  const cols = rows.length <= 1 ? "grid-cols-1" : "grid-cols-1 2xl:grid-cols-2";
  const nameOf = (row) => algoInfo?.[row.algorithm]?.name || row.algorithm;
  const statLine = (row) => {
    const s = row.stats || {};
    return `expand ${s.nodes_expanded ?? "—"} · path ${s.path_length ?? "—"} · cost ${s.cost ?? "—"} · ${s.time_ms ?? "—"}ms`;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px] items-start">
      <div>
        <h2 className="crt-label mb-3">◢ So sánh cây duyệt đồ thị ({rows.length} thuật toán)</h2>
        <div className={`grid gap-3 ${cols}`}>
          {rows.map((r) => (
            <SearchTreePreview
              key={r.algorithm}
              tree={r.tree}
              title={nameOf(r)}
              subtitle={r.error ? r.error : statLine(r)}
              treeMeta={{ truncated: !!r.tree_truncated, limit: r.tree_limit || 0 }}
            />
          ))}
        </div>
        {mapData && (
          <div className="mt-4">
            <h2 className="crt-label mb-3">◢ Kết quả đường đi trên maze</h2>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {rows.map((r) => (
                <MiniMaze key={r.algorithm} row={r} mapData={mapData} algoInfo={algoInfo} />
              ))}
            </div>
          </div>
        )}
      </div>
      <QuickStats rows={rows} algoInfo={algoInfo} />
    </div>
  );
}
