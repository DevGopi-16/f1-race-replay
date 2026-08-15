document.addEventListener("DOMContentLoaded", async () => {
  const setMetrics = document.getElementById("set-metrics");
  const setDriver = document.getElementById("set-driver");
  const setUnits = document.getElementById("set-units");
  const msg = document.getElementById("settings-msg");
  const submitBtn = document.getElementById("settings-submit-btn");
  const form = document.getElementById("settings-form");

  if (!setMetrics || !setDriver || !setUnits || !msg || !submitBtn || !form) {
    console.error("[Settings] Required settings elements are missing.");
    return;
  }

  function forceLogout() {
    localStorage.removeItem("f1_replay_token");
    localStorage.removeItem("f1_replay_units");
    localStorage.removeItem("f1_replay_metrics");
    localStorage.removeItem("f1_replay_driver");
    window.location.href = "/";
  }

  async function syncSettingsForm() {
    const token = localStorage.getItem("f1_replay_token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    // Apply cached values immediately to avoid flicker.
    const cachedUnits = localStorage.getItem("f1_replay_units");
    const cachedMetrics = localStorage.getItem("f1_replay_metrics");
    const cachedDriver = localStorage.getItem("f1_replay_driver");

    if (cachedUnits) setUnits.value = cachedUnits;
    if (cachedMetrics) setMetrics.value = cachedMetrics;
    if (cachedDriver) setDriver.value = cachedDriver;

    // Sync with backend.
    try {
      const res = await fetch("/auth/settings", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        forceLogout();
        return;
      }

      if (!res.ok) {
        console.warn("[Settings] Backend returned:", res.status);
        return;
      }

      const settings = await res.json();

      const activeUnits =
        localStorage.getItem("f1_replay_units") ||
        settings.units ||
        "metric";

      const activeMetrics =
        localStorage.getItem("f1_replay_metrics") ||
        settings.telemetry_preferences ||
        "speed,throttle,brake";

      const activeDriver =
        localStorage.getItem("f1_replay_driver") ||
        settings.default_driver_comp ||
        "VER";

      setUnits.value = activeUnits;
      setMetrics.value = activeMetrics;
      setDriver.value = activeDriver;

      localStorage.setItem("f1_replay_units", activeUnits);
      localStorage.setItem("f1_replay_metrics", activeMetrics);
      localStorage.setItem("f1_replay_driver", activeDriver);
    } catch (error) {
      console.error("[Settings] Failed to load settings:", error);
    }
  }

  await syncSettingsForm();

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      syncSettingsForm();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    msg.textContent = "Updating settings...";
    msg.style.color = "#94a3b8";
    submitBtn.disabled = true;

    const token = localStorage.getItem("f1_replay_token");

    if (!token) {
      forceLogout();
      return;
    }

    const selectedUnits = setUnits.value;
    const selectedMetrics = setMetrics.value;
    const selectedDriver = setDriver.value.trim().toUpperCase();

    if (!selectedDriver) {
      msg.textContent = "Default driver comparison can't be empty.";
      msg.style.color = "#ef4444";
      submitBtn.disabled = false;
      return;
    }

    // Save locally immediately.
    localStorage.setItem("f1_replay_units", selectedUnits);
    localStorage.setItem("f1_replay_metrics", selectedMetrics);
    localStorage.setItem("f1_replay_driver", selectedDriver);

    try {
      const resp = await fetch("/auth/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          telemetry_preferences: selectedMetrics,
          default_driver_comp: selectedDriver,
          units: selectedUnits
        })
      });

      if (resp.status === 401) {
        forceLogout();
        return;
      }

      if (resp.ok) {
        if (window.userSettings) {
          window.userSettings.units = selectedUnits;
          window.userSettings.telemetry_preferences = selectedMetrics;
          window.userSettings.default_driver_comp = selectedDriver;
        }

        if (typeof window.refreshUserSettingsUI === "function") {
          window.refreshUserSettingsUI();
        }

        msg.textContent = "Settings saved successfully!";
        msg.style.color = "#22c55e";
      } else {
        msg.textContent = "Saved locally!";
        msg.style.color = "#22c55e";
      }
    } catch (error) {
      console.error("[Settings] Failed to save settings:", error);

      msg.textContent = "Saved locally!";
      msg.style.color = "#22c55e";
    } finally {
      submitBtn.disabled = false;
    }
  });
});
