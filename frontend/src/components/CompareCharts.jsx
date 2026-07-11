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
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,176,0,0.1)" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="var(--color-amber-dim)" fontSize="10">{v}</text>
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
        <text key={nm} x={scaleX(i, names.length)} y={H - 10} textAnchor="middle" fill="var(--color-amber-dim)" fontSize="9">
          {nm}
        </text>
      ))}
    </g>
  );
}

// Line chart 1 series — mỗi biểu đồ có trục riêng để KHÔNG trộn đơn vị.
function SingleLineChart({ title, names, values, color, unit }) {
  const max = Math.max(1, ...values);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i, values.length)},${scaleY(v, max)}`).join(" ");
  return (
    <div className="crt-panel p-3">
      <h3 className="crt-label mb-1">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Axis max={max} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {values.map((v, i) => (
          <circle key={i} cx={scaleX(i, values.length)} cy={scaleY(v, max)} r="3" fill={color} />
        ))}
        <Labels names={names} />
      </svg>
      <div className="crt-label text-[12px] flex gap-3 normal-case">
        <span style={{ color }}>● {unit}</span>
      </div>
    </div>
  );
}

// Bar chart 1 series (bộ nhớ ước lượng) — trục riêng, không trộn với số node.
function MemoryBarChart({ names, values, color }) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const slot = (W - PAD.l - PAD.r) / n;
  const bw = slot * 0.5;
  const base = scaleY(0, max);
  return (
    <div className="crt-panel p-3">
      <h3 className="crt-label mb-1">Bộ nhớ ước lượng (KB)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Axis max={max} />
        {values.map((v, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          const y = scaleY(v, max);
          return <rect key={i} x={cx - bw / 2} y={y} width={bw} height={base - y} fill={color} />;
        })}
        <Labels names={names} />
      </svg>
      <div className="crt-label text-[12px] flex gap-3 normal-case">
        <span style={{ color }}>● Bộ nhớ (KB) — ước lượng từ frontier lớn nhất</span>
      </div>
    </div>
  );
}

export function CompareCharts({ rows, algoInfo }) {
  const valid = (rows || []).filter((r) => !r.error && r.stats);
  if (valid.length === 0) return null;
  const nameOf = (r) => algoInfo?.[r.algorithm]?.name || r.algorithm;
  const names = valid.map(nameOf);
  const nodes = valid.map((r) => r.stats?.nodes_expanded ?? 0);
  const times = valid.map((r) => r.stats?.time_ms ?? 0);
  const mem = valid.map((r) => r.stats?.memory_kb ?? 0);
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <SingleLineChart title="Số node expand" names={names} values={nodes} color="var(--color-inky)" unit="Node expand" />
      <SingleLineChart title="Thời gian (ms)" names={names} values={times} color="var(--color-time)" unit="Thời gian (ms)" />
      <MemoryBarChart names={names} values={mem} color="var(--color-h)" />
    </div>
  );
}
