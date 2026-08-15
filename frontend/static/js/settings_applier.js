/**
 * settings_applier.js
 * Single source of truth for fetching and applying user settings.
 */

const DEFAULT_SETTINGS = {
  units: "metric",
  telemetry_preferences: "speed,throttle,brake",
  default_driver_comp: "VER",
  accent_color: "#e10600",
  theme: "dark"
};

// Retrieve local cached preferences first
const savedUnits = localStorage.getItem("f1_replay_units");
const savedMetrics = localStorage.getItem("f1_replay_metrics");
const savedDriver = localStorage.getItem("f1_replay_driver");

window.userSettings = {
  ...DEFAULT_SETTINGS,
  ...(savedUnits ? { units: savedUnits } : {}),
  ...(savedMetrics ? { telemetry_preferences: savedMetrics } : {}),
  ...(savedDriver ? { default_driver_comp: savedDriver } : {})
};

window.userSettingsReady = new Promise((resolve) => {
  window._resolveUserSettingsReady = resolve;
});

window.formatSpeed = function (speedKmh) {
  if (window.userSettings.units === "imperial") {
    const mph = Math.round(speedKmh * 0.621371);
    return `${mph} mph`;
  }
  return `${Math.round(speedKmh)} km/h`;
};

window.formatTemp = function (tempC) {
  if (window.userSettings.units === "imperial") {
    const tempF = Math.round((tempC * 9) / 5 + 32);
    return `${tempF}°F`;
  }
  return `${Math.round(tempC)}°C`;
};

function applyAccentColor(accentColor) {
  if (!accentColor) return;
  document.documentElement.style.setProperty("--accent-color", accentColor);
  document.documentElement.style.setProperty("--primary-red", accentColor);
}

function forceLogoutIfUnauthenticated() {
  localStorage.removeItem("f1_replay_token");
  localStorage.removeItem("f1_replay_units");
  localStorage.removeItem("f1_replay_metrics");
  localStorage.removeItem("f1_replay_driver");
  window.location.href = "/";
}

async function applyUserSettings() {
  const token = localStorage.getItem("f1_replay_token");
  if (!token) {
    window._resolveUserSettingsReady(window.userSettings);
    return;
  }

  try {
    const res = await fetch("/auth/settings", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      forceLogoutIfUnauthenticated();
      return;
    }

    if (res.ok) {
      const settings = await res.json();
      
      const activeUnits = localStorage.getItem("f1_replay_units") || settings.units || "metric";
      const activeMetrics = localStorage.getItem("f1_replay_metrics") || settings.telemetry_preferences || "speed,throttle,brake";
      const activeDriver = localStorage.getItem("f1_replay_driver") || settings.default_driver_comp || "VER";

      window.userSettings = { 
        ...window.userSettings, 
        ...settings, 
        units: activeUnits,
        telemetry_preferences: activeMetrics,
        default_driver_comp: activeDriver
      };

      localStorage.setItem("f1_replay_units", activeUnits);
      localStorage.setItem("f1_replay_metrics", activeMetrics);
      localStorage.setItem("f1_replay_driver", activeDriver);

      applyAccentColor(settings.accent_color);

      window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: window.userSettings }));
      console.log("[Settings] Applied global user preferences:", window.userSettings);
    }
  } catch (err) {
    console.error("[Settings] Failed to fetch user settings:", err);
  } finally {
    window._resolveUserSettingsReady(window.userSettings);
  }
}

window.refreshUserSettingsUI = function () {
  if (window.userSettings) {
    if (window.userSettings.units) localStorage.setItem("f1_replay_units", window.userSettings.units);
    if (window.userSettings.telemetry_preferences) localStorage.setItem("f1_replay_metrics", window.userSettings.telemetry_preferences);
    if (window.userSettings.default_driver_comp) localStorage.setItem("f1_replay_driver", window.userSettings.default_driver_comp);
  }
  applyAccentColor(window.userSettings.accent_color);
  window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: window.userSettings }));
};

document.addEventListener("DOMContentLoaded", applyUserSettings);