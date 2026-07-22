/** Shared theme helpers — client-side only when touching document/localStorage. */

export const THEME_COOKIE = "paova-theme";
export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "dark" || value === "light") return value;
  } catch {
    // private mode
  }
  return null;
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function resolveTheme(explicit?: Theme | null): Theme {
  return explicit ?? readStoredTheme() ?? (systemPrefersDark() ? "dark" : "light");
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures.
  }

  // Cookie so the server can render <html class="dark"> and avoid flashes
  // after redirects / server actions.
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore cookie failures.
  }
}
