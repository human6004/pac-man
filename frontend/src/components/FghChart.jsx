// FghChart.jsx — Biểu đồ g/h/f theo thứ tự node expand cho 1 thuật toán.
//
// Mở khi click 1 dòng trong CompareTable. Nhận row có tree (list node
// {id,parent,pos,g,h,f} theo thứ tự expand). Chỉ có ý nghĩa với bài
// path_to_nearest (tree không rỗng); eat_all -> báo hướng dẫn.

const W = 520;
const H = 220;
const PAD = { l: 40, r: 12, t: 16, b: 28 };

const sx = (i, n) => PAD.l + (n > 1 ? (i / (n - 1)) * (W - PAD.l - PAD.r) : (W - PAD.l - PAD.r) / 2);
const sy = (v, max) => {
  const h = H - PAD.t - PAD.b;
  return PAD.t + h - (max ? (v / max) * h : 0);
};

export function FghChart({ row, algoInfo }) {
  if (!row) return null;
  const name = algoInfo?.[row.algorithm]?.name || row.algorithm;
  const tree = row.tree || [];

  if (tree.length === 0) {
    return (
      <div className="crt-panel p-4">
        <h2 className="crt-label mb-2">◢ f / g / h — {name}</h2>
        <p className="crt-label text-[13px]">
          Chọn bài "Đi tới food gần nhất" để xem biểu đồ f/g/h (bài "ăn hết food" không dựng cây).
        </p>
      </div>
    );
  }

  const g = tree.map((n) => n.g);
  const h = tree.map((n) => n.h);
  const f = tree.map((n) => n.f);
  const max = Math.max(1, ...f, ...g, ...h);
  const line = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${sx(i, arr.length)},${sy(v, max)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div className="crt-panel p-4">
      <h2 className="crt-label mb-2">◢ f / g / h theo bước expand — {name}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {ticks.map((v) => {
          const y = sy(v, max);
          return (
            <g key={v}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="#9aa" fontSize="10">{v}</text>
            </g>
          );
        })}
        <path d={line(f)} fill="none" stroke="#34d399" strokeWidth="2" />
        <path d={line(g)} fill="none" stroke="#8b5cf6" strokeWidth="2" />
        <path d={line(h)} fill="none" stroke="#60a5fa" strokeWidth="2" />
        <text x={PAD.l} y={H - 8} fill="#9aa" fontSize="10">node #0</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fill="#9aa" fontSize="10">#{tree.length - 1}</text>
      </svg>
      <div className="crt-label text-[12px] flex gap-4 mt-1">
        <span style={{ color: "#8b5cf6" }}>● g (chi phí)</span>
        <span style={{ color: "#60a5fa" }}>● h (heuristic)</span>
        <span style={{ color: "#34d399" }}>● f = g + h</span>
      </div>
    </div>
  );
}
