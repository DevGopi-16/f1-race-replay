/* ==========================================
   F1 REPLAY - PROFILE DASHBOARD CONTROLLER
   ========================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("f1_replay_token");

  // 1. Theme Toggle Handler
  const btnLight = document.getElementById("btn-theme-light");
  const btnDark = document.getElementById("btn-theme-dark");

  if (btnLight && btnDark) {
    btnLight.addEventListener("click", () => {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      btnLight.classList.add("active");
      btnDark.classList.remove("active");
      localStorage.setItem("f1_theme", "light");
    });

    btnDark.addEventListener("click", () => {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      btnDark.classList.add("active");
      btnLight.classList.remove("active");
      localStorage.setItem("f1_theme", "dark");
    });

    // Restore saved theme preference
    const savedTheme = localStorage.getItem("f1_theme");
    if (savedTheme === "dark") {
      btnDark.click();
    }
  }
  // 2. Profile Sub-Tab Switching
  const tabBtns = document.querySelectorAll(".profile-tabs .tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        tabPanels.forEach((panel) => panel.classList.add("hidden"));
        const targetId = btn.dataset.tab;
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.remove("hidden");
    });
  });


  // 3. Render Performance Radar Chart using Chart.js
  initRadarChart();

  // 4. Modal Pop-up Handlers
  initEditProfileModal();

  // 4b. Wire up remaining action buttons
  const avatarEditBtn = document.querySelector(".avatar-edit-btn");
  if (avatarEditBtn) {
    avatarEditBtn.addEventListener("click", () => {
        const editBtn = document.getElementById("btn-edit-profile");
        if (editBtn) editBtn.click(); // opens the existing edit modal
    });
  }

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

  const addBannerBtn = document.querySelector(".banner-promo-card .btn-primary-sm");
  if (addBannerBtn) {
    addBannerBtn.addEventListener("click", () => {
        alert("Banner upload coming soon.");
    });
  }

  document.querySelectorAll(".btn-watch").forEach((btn) => {
    btn.addEventListener("click", () => {
        alert("Replay playback coming soon.");
    });
  });

  // 5. Fetch Profile Data from Backend (If Auth Token exists)
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
      // Pre-fill modal input with current displayed username
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

  // Close modal when clicking on dark overlay backdrop
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
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              username: newUsername,
              favorite_driver: newDriver,
              favorite_team: newTeam
            })
          });

          if (!res.ok) throw new Error("Failed to save changes on server");
        }

        // Locally update UI elements
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
          backgroundColor: "rgba(225, 6, 0, 0.2)",
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


