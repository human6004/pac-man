const LEGEND = [
  ["Pac-Man", "var(--color-pac)", true],
  ["Thức ăn", "var(--color-pellet)", true],
  ["Power pellet", "#FFF04D", true],
  ["Ghost", "var(--state-current)", false],
  ["Ô đã duyệt", "var(--color-g)", false],
  ["Đường đi", "var(--color-pac)", false],
];

export function Cabinet({ children, tab, onTabChange, soundOn, onToggleSound, theme, onToggleTheme }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <header className="app-header">
        <div className="brand-block">
          <strong>PAC-MAN</strong>
          <span>AI Search Lab</span>
        </div>
        <nav className="top-tabs" role="tablist" aria-label="Khu vực làm việc">
          <button type="button" role="tab" aria-selected={tab === "play"} className={tab === "play" ? "is-active" : ""} onClick={() => onTabChange("play")}>
            Chạy
          </button>
          <button type="button" role="tab" aria-selected={tab === "compare"} className={tab === "compare" ? "is-active" : ""} onClick={() => onTabChange("compare")}>
            So sánh
          </button>
        </nav>
        <div className="header-actions">
          <button type="button" className="text-toggle" aria-pressed={soundOn} onClick={onToggleSound}>
            Âm thanh: {soundOn ? "Bật" : "Tắt"}
          </button>
          <button type="button" className="text-toggle" onClick={onToggleTheme}>
            Giao diện: {theme === "dark" ? "Tối" : "Sáng"}
          </button>
        </div>
      </header>

      <main id="main-content" className="app-content">{children}</main>

      <footer className="app-legend" aria-label="Chú giải bản đồ">
        {LEGEND.map(([label, color, round]) => (
          <span key={label}>
            <i style={{ background: color, borderRadius: round ? "50%" : "3px" }} />
            {label}
          </span>
        ))}
      </footer>
    </div>
  );
}
