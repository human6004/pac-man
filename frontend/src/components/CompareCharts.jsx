// CompareCharts.jsx — Biểu đồ so sánh vẽ tay bằng SVG (không thêm thư viện).
//
// Trái: line chart nodes_expanded + time_ms theo thứ tự thuật toán.
// Phải: bar chart nodes_expanded vs memory_kb.
// ponytail: SVG tay, đủ cho demo — thêm recharts nếu cần tương tác sâu.

const W = 360;
const H = 200;
const PAD = { l: 40, r: 12, t: 16, b: 30 };

function scaleY(v, max) {
  const h = H - PAD.t - PAD.b;
  return PAD.t + h - (max ? (v / max) * h : 0);
}
function scaleX(i, n) {
  const w = W - PAD.l - PAD.r;
  return PAD.l + (n > 1 ? (i / (n - 1)) * w : w / 2);
}

function Axis({ max }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  return (
    <g>
      {ticks.map((v) => {
        const y = scaleY(v, max);
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.08)" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="#9aa" fontSize="10">{v}</text>
          </g>
        );
      })}
    </g>
  );
}

function Labels({ names }) {
  return (
    <g>
      {names.map((nm, i) => (
        <text key={nm} x={scaleX(i, names.length)} y={H - 10} textAnchor="middle" fill="#9aa" fontSize="10">
          {nm}
        </text>
      ))}
    </g>
  );
}

function LineChart({ rows, nameOf }) {
  const names = rows.map(nameOf);
  const nodes = rows.map((r) => r.stats?.nodes_expanded ?? 0);
  const times = rows.map((r) => r.stats?.time_ms ?? 0);
  const max = Math.max(1, ...nodes, ...times);
  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i, arr.length)},${scaleY(v, max)}`).join(" ");

  return (
    <div className="crt-panel p-3">
      <h3 className="crt-label mb-1">Performance (nodes / time)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Axis max={max} />
        <path d={path(nodes)} fill="none" stroke="#8b5cf6" strokeWidth="2" />
        <path d={path(times)} fill="none" stroke="#22d3ee" strokeWidth="2" />
        {nodes.map((v, i) => <circle key={"n" + i} cx={scaleX(i, nodes.length)} cy={scaleY(v, max)} r="3" fill="#8b5cf6" />)}
        {times.map((v, i) => <circle key={"t" + i} cx={scaleX(i, times.length)} cy={scaleY(v, max)} r="3" fill="#22d3ee" />)}
        <Labels names={names} />
      </svg>
      <div className="crt-label text-[12px] flex gap-3">
        <span style={{ color: "#8b5cf6" }}>● Expanded</span>
        <span style={{ color: "#22d3ee" }}>● Time (ms)</span>
      </div>
    </div>
  );
}

function BarChart({ rows, nameOf }) {
  const names = rows.map(nameOf);
  const nodes = rows.map((r) => r.stats?.nodes_expanded ?? 0);
  const mem = rows.map((r) => r.stats?.memory_kb ?? 0);
  const max = Math.max(1, ...nodes, ...mem);
  const n = rows.length;
  const slot = (W - PAD.l - PAD.r) / n;
  const bw = slot * 0.32;

  return (
    <div className="crt-panel p-3">
      <h3 className="crt-label mb-1">Resource (nodes / memory)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Axis max={max} />
        {rows.map((r, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          const y1 = scaleY(nodes[i], max);
          const y2 = scaleY(mem[i], max);
          const base = scaleY(0, max);
          return (
            <g key={r.algorithm}>
              <rect x={cx - bw - 1} y={y1} width={bw} height={base - y1} fill="#60a5fa" />
              <rect x={cx + 1} y={y2} width={bw} height={base - y2} fill="#34d399" />
            </g>
          );
        })}
        <Labels names={names} />
      </svg>
      <div className="crt-label text-[12px] flex gap-3">
        <span style={{ color: "#60a5fa" }}>● Expanded</span>
        <span style={{ color: "#34d399" }}>● Memory (KB)</span>
      </div>
    </div>
  );
}

export function CompareCharts({ rows, algoInfo }) {
  const valid = (rows || []).filter((r) => !r.error && r.stats);
  if (valid.length === 0) return null;
  const nameOf = (r) => algoInfo?.[r.algorithm]?.name || r.algorithm;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LineChart rows={valid} nameOf={nameOf} />
      <BarChart rows={valid} nameOf={nameOf} />
    </div>
  );
}
