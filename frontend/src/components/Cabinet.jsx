const LEGEND = [
  ["Pac-Man", "var(--color-pac)", true],
  ["Food", "var(--color-pellet)", true],
  ["Power pellet", "#FFF04D", true],
  ["Ghost", "var(--state-current)", false],
  ["Explored cell", "var(--color-g)", false],
  ["Path", "var(--color-pac)", false],
];

export function Cabinet({ children, tab, onTabChange, soundOn, onToggleSound, theme, onToggleTheme }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="brand-block">
          <strong>PAC-MAN</strong>
          <span>AI Search Lab</span>
        </div>
        <nav className="top-tabs" role="tablist" aria-label="Workspace">
          <button type="button" role="tab" aria-selected={tab === "play"} className={tab === "play" ? "is-active" : ""} onClick={() => onTabChange("play")}>
            Run
          </button>
          <button type="button" role="tab" aria-selected={tab === "compare"} className={tab === "compare" ? "is-active" : ""} onClick={() => onTabChange("compare")}>
            Compare
          </button>
        </nav>
        <div className="header-actions">
          <button type="button" className="text-toggle" aria-pressed={soundOn} onClick={onToggleSound}>
            Sound: {soundOn ? "On" : "Off"}
          </button>
          <button type="button" className="text-toggle" onClick={onToggleTheme}>
            Theme: {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </header>

      <main id="main-content" className="app-content">{children}</main>

      <footer className="app-legend" aria-label="Map legend">
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
