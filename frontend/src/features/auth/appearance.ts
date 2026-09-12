export type AppearanceTheme = "dark" | "light" | "system";

export type AppearanceAccent =
  | "#e10600"
  | "#ff1744"
  | "#ffffff";

const DEFAULT_THEME: AppearanceTheme = "dark";
const DEFAULT_ACCENT: AppearanceAccent = "#e10600";

function resolveTheme(
  theme: string | null | undefined,
): "dark" | "light" {
  if (theme === "light") {
    return "light";
  }

  if (theme === "system") {
    return window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches
      ? "light"
      : "dark";
  }

  return "dark";
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");

  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const number = Number.parseInt(value, 16);

  if (Number.isNaN(number)) {
    return { r: 225, g: 6, b: 0 };
  }

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function mix(
  first: string,
  second: string,
  amount: number,
) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);

  const r = Math.round(
    a.r + (b.r - a.r) * amount,
  );

  const g = Math.round(
    a.g + (b.g - a.g) * amount,
  );

  const bValue = Math.round(
    a.b + (b.b - a.b) * amount,
  );

  return `rgb(${r}, ${g}, ${bValue})`;
}

export function applyAppearance(
  theme: string,
  accent: string,
) {
  if (typeof document === "undefined") {
    return;
  }

  const selectedTheme = resolveTheme(
    theme || DEFAULT_THEME,
  );

  const selectedAccent =
    accent || DEFAULT_ACCENT;

  const rgb = hexToRgb(selectedAccent);

  const root = document.documentElement;

  root.dataset.theme = selectedTheme;
  root.dataset.accent = selectedAccent;

  root.style.setProperty(
    "--color-accent",
    selectedAccent,
  );

  root.style.setProperty(
    "--color-accent-hover",
    mix(selectedAccent, "#ffffff", 0.25),
  );

  root.style.setProperty(
    "--color-accent-soft",
    `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
  );

  root.style.setProperty(
    "--color-accent-glow",
    `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
  );

  root.style.setProperty(
    "--border-accent",
    `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`,
  );

  root.style.setProperty(
    "--shadow-accent",
    `0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
  );
}

export function initializeAppearance() {
  if (typeof window === "undefined") {
    return;
  }

  const savedTheme =
    localStorage.getItem("f1_theme") ||
    DEFAULT_THEME;

  const savedAccent =
    localStorage.getItem("f1_accent_color") ||
    DEFAULT_ACCENT;

  applyAppearance(
    savedTheme,
    savedAccent,
  );
}

export function saveAppearanceLocally(
  theme: string,
  accent: string,
) {
  localStorage.setItem(
    "f1_theme",
    theme,
  );

  localStorage.setItem(
    "f1_accent_color",
    accent,
  );

  applyAppearance(
    theme,
    accent,
  );
}
