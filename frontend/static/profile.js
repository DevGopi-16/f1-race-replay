/* F1 REPLAY - PROFILE DASHBOARD CONTROLLER */

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("f1_replay_token");

  // 1. Theme Toggle Handler
  initThemeToggle();

  // 2. Profile Sub-Tab Switching
  initTabNavigation();

  // 3. Render Performance Radar Chart using Chart.js
  initRadarChart();

  // 4. Modal Pop-up Handlers
  initEditProfileModal();

  // 5. Action Buttons (Avatar, Share, Banner Upload, Watch Replays)
  initActionButtons();

  // 6. Fetch Profile Data from Backend (If Auth Token exists)
  if (token) {
    try {
      const res = await fetch("/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const username = data.username || "GopiPrajapati";
        const driver = data.favorite_driver || "Lewis Hamilton";
        const team = data.favorite_team || "Scuderia Ferrari";

        // Update UI Elements
        updateProfileUI(username, driver, team, data.picture_url);
      }
    } catch (err) {
      console.warn("[Profile] Unable to load live backend user profile:", err);
    }
  }
});


/* Liquid Glass Theme Switch Handler*/
function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggleBtn");

  // Force default to light mode unless explicitly set to dark
  const savedTheme = localStorage.getItem("f1_theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark-theme");

      if (isDark) {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        localStorage.setItem("f1_theme", "light");
      } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        localStorage.setItem("f1_theme", "dark");
      }

      if (typeof updateRadarChartTheme === "function") {
        updateRadarChartTheme(isDark);
      }
    });
  }
}

/**
 * Updates Chart.js radar chart colors when switching themes
 */
function updateRadarChartTheme(isDark) {
  const chartInstance = Chart.getChart("performanceRadarChart");
  if (chartInstance) {
    const gridColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(203, 213, 225, 0.4)";
    const labelColor = isDark ? "#94a3b8" : "#64748b";

    chartInstance.options.scales.r.grid.color = gridColor;
    chartInstance.options.scales.r.angleLines.color = gridColor;
    chartInstance.options.scales.r.pointLabels.color = labelColor;
    chartInstance.update();
  }
}

/**
 * Sub-Tab Navigation Switcher
 */
function initTabNavigation() {
  const tabBtns = document.querySelectorAll(".profile-tabs .tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const dashboardBody = document.querySelector(".dashboard-body");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const targetId = btn.dataset.tab;

      // Handle overview tab separately to show main dashboard body
      if (targetId === "overview-panel") {
        if (dashboardBody) dashboardBody.style.display = "flex";
        tabPanels.forEach((panel) => panel.classList.add("hidden"));
        return;
      }

      // Hide main overview grid and show specific target tab panel
      if (dashboardBody) dashboardBody.style.display = "none";
      tabPanels.forEach((panel) => panel.classList.add("hidden"));

      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.remove("hidden");
    });
  });
}

/**
 * Action Buttons Initialization (Edit Avatar, Share, Add Banner, Replay buttons)
 */
function initActionButtons() {
  // Avatar Edit Trigger
  const avatarEditBtn = document.querySelector(".avatar-edit-btn");
  if (avatarEditBtn) {
    avatarEditBtn.addEventListener("click", () => {
      const editBtn = document.getElementById("btn-edit-profile");
      if (editBtn) editBtn.click();
    });
  }

  // Share Profile Link
  const shareBtn = document.querySelector(".btn-secondary");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        alert("Profile link copied to clipboard!");
      } catch {
        prompt("Copy your profile link:", url);
      }
    });
  }

  // Add Banner Handler (Completes profile to 100%)
  const addBannerBtn = document.querySelector(".banner-promo-card .btn-primary-sm");
  if (addBannerBtn) {
    addBannerBtn.addEventListener("click", () => {
      completeProfileTo100();
    });
  }

  // Replay Watch Buttons
  document.querySelectorAll(".btn-watch").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const raceName = e.target.closest(".replay-item")?.querySelector("strong")?.textContent || "Race Replay";
      alert(`Launching session replay: ${raceName}`);
    });
  });
}

/**
 * Updates UI completion ring and checklist to 100%
 */
function completeProfileTo100() {
  const circle = document.querySelector(".circle");
  const pctText = document.querySelector(".percentage");
  const promoCard = document.querySelector(".banner-promo-card");

  // Animate circular chart to 100%
  if (circle) circle.setAttribute("stroke-dasharray", "100, 100");
  if (pctText) pctText.textContent = "100%";

  // Add a visual banner gradient to top hero
  const heroCard = document.querySelector(".hero-banner-card");
  if (heroCard) {
    heroCard.style.background = "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #e10600 100%)";
  }

  // Hide the banner completion callout
  if (promoCard) {
    promoCard.style.transition = "opacity 0.3s ease";
    promoCard.style.opacity = "0";
    setTimeout(() => {
      promoCard.style.display = "none";
    }, 300);
  }

  alert("🎉 Profile Banner Added! Your Profile is now 100% complete.");
}

/**
 * Updates DOM text and image elements with profile values
 */
function updateProfileUI(username, driver, team, pictureUrl) {
  const heroName = document.getElementById("hero-username");
  const topbarName = document.getElementById("topbar-username");
  const favDriver = document.getElementById("fav-driver-name");
  const favTeam = document.getElementById("fav-team-name");

  if (heroName) heroName.textContent = username;
  if (topbarName) topbarName.textContent = username;
  if (favDriver) favDriver.textContent = driver;
  if (favTeam) favTeam.textContent = team;

  if (pictureUrl) {
    const heroAvatar = document.getElementById("hero-avatar");
    const topbarAvatar = document.getElementById("topbar-avatar");
    if (heroAvatar) heroAvatar.src = pictureUrl;
    if (topbarAvatar) topbarAvatar.src = pictureUrl;
  }
}

/**
 * Initializes Edit Profile Modal open, close, and form submission listeners
 */
function initEditProfileModal() {
  const modal = document.getElementById("editProfileModal");
  const editBtn = document.getElementById("btn-edit-profile");
  const closeBtn = document.getElementById("closeModalBtn");
  const editForm = document.getElementById("editProfileForm");

  if (editBtn && modal) {
    editBtn.addEventListener("click", () => {
      const heroName = document.getElementById("hero-username");
      const modalUsername = document.getElementById("modalUsername");
      if (heroName && modalUsername) {
        modalUsername.value = heroName.textContent.trim();
      }
      modal.classList.remove("hidden");
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = localStorage.getItem("f1_replay_token");
      const newUsername = document.getElementById("modalUsername").value;
      const newDriver = document.getElementById("modalDriver").value;
      const newTeam = document.getElementById("modalTeam").value;

      try {
        if (token) {
          const res = await fetch("/auth/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              username: newUsername,
              favorite_driver: newDriver,
              favorite_team: newTeam,
            }),
          });

          if (!res.ok) throw new Error("Failed to save changes on server");
        }

        updateProfileUI(newUsername, newDriver, newTeam);
        if (modal) modal.classList.add("hidden");
      } catch (err) {
        console.error("[Profile] Failed to update profile:", err);
      }
    });
  }
}

/**
 * Initializes the Chart.js Radar Chart for Performance Overview
 */
function initRadarChart() {
  const ctx = document.getElementById("performanceRadarChart");
  if (!ctx) return;

  if (typeof Chart === "undefined") {
    console.error("[Profile] Chart.js library not loaded.");
    return;
  }

  new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Pace", "Consistency", "Racecraft", "Telemetry", "Strategy"],
      datasets: [
        {
          label: "You",
          data: [82, 76, 74, 91, 68],
          fill: true,
          backgroundColor: "rgba(225, 6, 0, 0.25)",
          borderColor: "#E10600",
          borderWidth: 2,
          pointBackgroundColor: "#E10600",
          pointBorderColor: "#FFFFFF",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Top 12% Avg",
          data: [85, 80, 78, 88, 75],
          fill: false,
          borderColor: "#94A3B8",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.raw}%`,
          },
        },
      },
      scales: {
        r: {
          angleLines: { color: "rgba(203, 213, 225, 0.4)" },
          grid: { color: "rgba(203, 213, 225, 0.4)" },
          pointLabels: {
            font: { size: 10, weight: "700" },
            color: "#64748B",
          },
          ticks: { display: false },
          suggestedMin: 50,
          suggestedMax: 100,
        },
      },
    },
  });
}