const LEGEND = [
  ["Pac-Man", "var(--color-pac)", true],
  ["Food", "var(--color-amber)", true],
  ["Ghost", "var(--state-current)", false],
  ["Explored cell", "var(--color-g)", false],
  ["Path", "var(--color-pac)", false],
];

function SoundIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v4h4l5 4V6L8 10H4Z" />
      {muted ? (
        <path d="m17 9 4 4m0-4-4 4" />
      ) : (
        <>
          <path d="M16 9.5a4 4 0 0 1 0 5" />
          <path d="M19 7a8 8 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

function ThemeIcon({ theme }) {
  const isDark = theme === "dark";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {isDark ? (
        <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
    </svg>
  );
}

export function Cabinet({ children, tab, onTabChange, soundOn, onToggleSound, theme, onToggleTheme }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="brand-block">
          <strong>PACMAN</strong>
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
          <button type="button" className="text-toggle icon-toggle" aria-label={soundOn ? "Mute sound" : "Enable sound"} aria-pressed={soundOn} onClick={onToggleSound}>
            <SoundIcon muted={!soundOn} />
          </button>
          <button type="button" className="text-toggle icon-toggle" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={theme === "dark"} onClick={onToggleTheme}>
            <ThemeIcon theme={theme} />
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
