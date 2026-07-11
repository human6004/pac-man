// Cabinet.jsx — Khung "thùng game arcade": marquee phát sáng trên cùng + legend
// chú thích các ký hiệu trong maze. Bọc nội dung con (màn hình + panel).

const LEGEND = [
  ["Pac-man", "var(--color-pac)", true],
  ["Food", "var(--color-pellet)", true],
  ["Power pellet", "#FFF04D", true],
  ["Ma", "var(--color-blinky)", false],
  ["Ô đã duyệt", "rgba(0,255,255,0.5)", false],
  ["Đường đi", "var(--color-pac)", false],
];

export function Cabinet({ children }) {
  return (
    <div className="min-h-screen px-4 py-6 flex flex-col items-center">
      {/* MARQUEE */}
      <header className="text-center mb-6 select-none">
        <h1 className="marquee-title text-[clamp(13px,2.6vw,26px)]">
          PAC-MAN A.I. SEARCH
        </h1>
        <p className="font-term text-[color:var(--color-inky)] text-[15px] sm:text-[18px] mt-2 text-glow-soft">
          tìm kiếm mù · có thông tin · đối kháng
        </p>
      </header>

      <div className="w-full max-w-[1800px]">{children}</div>

      {/* LEGEND */}
      <footer className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 font-term text-[18px] text-[color:var(--color-amber-dim)]">
        {LEGEND.map(([label, color, round]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <i
              className="inline-block w-3.5 h-3.5"
              style={{ background: color, borderRadius: round ? "50%" : "3px" }}
            />
            {label}
          </span>
        ))}
      </footer>
    </div>
  );
}
