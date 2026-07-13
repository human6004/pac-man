export const THEME_KEY = "pacman-ui-theme";

export function resolveTheme(storedTheme, prefersDark) {
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return prefersDark ? "dark" : "light";
}

export function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  return resolveTheme(
    window.localStorage.getItem(THEME_KEY),
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function persistTheme(theme) {
  window.localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
