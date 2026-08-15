const Auth = (() => {
  const API_BASE_URL = "";
  const TOKEN_KEY = "f1_replay_token";
  const GOOGLE_CLIENT_ID = "3151390342-jd4omku90qolovv44dsjph7a5v7sj2b7.apps.googleusercontent.com";

  let currentUser = null;

  // SVG Brand Icons (Real vector graphics, no emojis)
  const ICONS = {
    google: `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 13.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-3.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/></svg>`,
    discord: `<svg width="20" height="15" viewBox="0 0 127.14 96.36" fill="#5865F2"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.32 0-11.5-5.81-11.5-12.91s5.08-12.91 11.5-12.91c6.47 0 11.61 5.86 11.5 12.91 0 7.1-5.03 12.91-11.5 12.91zm42.24 0c-6.32 0-11.5-5.81-11.5-12.91s5.08-12.91 11.5-12.91c6.47 0 11.61 5.86 11.5 12.91 0 7.1-5.03 12.91-11.5 12.91z"/></svg>`,
    x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    key: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3.5"/></svg>`
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Something went wrong");
    }
    return data;
  }

  function buildModal() {
    if (document.getElementById("auth-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "auth-modal-overlay";
    overlay.id = "auth-modal-overlay";
    overlay.innerHTML = `
      <div class="auth-top-brand">
        <div class="auth-brand-logo">F1<span>+</span></div>
      </div>

      <div class="auth-terminal-card">
        <div class="auth-badge-pill">
          <span class="auth-badge-dot"></span> ACCESS TERMINAL
        </div>

        <h1 class="auth-modal__title">AUTHENTICATE</h1>
        <p class="auth-modal__subtitle">Secure your access to live data, predictions, and private leagues.</p>
        <p class="auth-modal__hint">Free to join • No credit card required</p>

        <!-- OAuth Terminal Options -->
        <div id="auth-social-view" class="auth-social-list">
          <div id="google-btn-slot" class="google-btn-slot"></div>
          
          <button class="auth-btn-terminal" id="btn-auth-discord">
            <span class="auth-btn-icon">${ICONS.discord}</span> CONTINUE WITH DISCORD
          </button>
          
          <button class="auth-btn-terminal" id="btn-auth-x">
            <span class="auth-btn-icon">${ICONS.x}</span> CONTINUE WITH X
          </button>

          <button class="auth-btn-terminal" id="btn-auth-passkey">
            <span class="auth-btn-icon">${ICONS.key}</span> SIGN IN WITH EMAIL / PASSWORD
          </button>
        </div>

        <!-- Custom Form (Login / Signup Toggle View) -->
        <div id="auth-email-view" style="display:none; width: 100%;">
          <div style="display:flex; justify-content: center; gap: 20px; margin-bottom: 16px;">
            <button type="button" id="tab-login" style="background:none; border:none; color:#fff; font-family:var(--auth-font-display); font-size:12px; font-weight:700; cursor:pointer; border-bottom: 2px solid var(--auth-red); padding-bottom: 4px;">LOG IN</button>
            <button type="button" id="tab-signup" style="background:none; border:none; color:var(--auth-muted); font-family:var(--auth-font-display); font-size:12px; font-weight:700; cursor:pointer; padding-bottom: 4px;">SIGN UP</button>
          </div>

          <form id="email-auth-form" class="auth-form">
            <div class="auth-field" id="field-username" style="display:none;">
              <label>USERNAME</label>
              <input type="text" name="username" placeholder="RacerX" />
            </div>
            <div class="auth-field">
              <label>EMAIL ADDRESS</label>
              <input type="email" name="email" required autocomplete="email" placeholder="driver@f1replay.com" />
            </div>
            <div class="auth-field">
              <label>PASSWORD</label>
              <input type="password" name="password" required autocomplete="current-password" placeholder="••••••••" />
            </div>
            <div class="auth-error" id="auth-form-error"></div>
            <button type="submit" class="auth-submit-btn" id="email-submit-label">LOG IN</button>
          </form>
          <button class="auth-back-home" id="btn-back-social" style="margin-top:14px;">← BACK TO TERMINAL</button>
        </div>

        <p class="auth-terms-note">By signing in, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a></p>

        <div class="auth-divider-line"></div>

        <button class="auth-back-home" id="auth-modal-close">← BACK TO HOME</button>
      </div>

      <div class="auth-checkered-strip"></div>
    `;

    document.body.appendChild(overlay);

    let isSignupMode = false;

    // Event handlers
    overlay.querySelector("#auth-modal-close").addEventListener("click", closeModal);
    
    // Switch to Email view
    overlay.querySelector("#btn-auth-passkey").addEventListener("click", () => {
      document.getElementById("auth-social-view").style.display = "none";
      document.getElementById("auth-email-view").style.display = "block";
    });

    // Back to Social Options
    overlay.querySelector("#btn-back-social").addEventListener("click", () => {
      document.getElementById("auth-social-view").style.display = "flex";
      document.getElementById("auth-email-view").style.display = "none";
    });

    // Toggle Login vs Signup tabs inside Email view
    const tabLogin = overlay.querySelector("#tab-login");
    const tabSignup = overlay.querySelector("#tab-signup");
    const fieldUsername = overlay.querySelector("#field-username");
    const submitLabel = overlay.querySelector("#email-submit-label");

    tabLogin.addEventListener("click", () => {
      isSignupMode = false;
      tabLogin.style.color = "#fff";
      tabLogin.style.borderBottom = "2px solid var(--auth-red)";
      tabSignup.style.color = "var(--auth-muted)";
      tabSignup.style.borderBottom = "none";
      fieldUsername.style.display = "none";
      submitLabel.textContent = "LOG IN";
    });

    tabSignup.addEventListener("click", () => {
      isSignupMode = true;
      tabSignup.style.color = "#fff";
      tabSignup.style.borderBottom = "2px solid var(--auth-red)";
      tabLogin.style.color = "var(--auth-muted)";
      tabLogin.style.borderBottom = "none";
      fieldUsername.style.display = "block";
      submitLabel.textContent = "CREATE ACCOUNT";
    });

    // Discord OAuth Action
    overlay.querySelector("#btn-auth-discord").addEventListener("click", () => {
      window.location.href = "/auth/discord";
    });

    // X OAuth Action
    overlay.querySelector("#btn-auth-x").addEventListener("click", () => {
      window.location.href = "/auth/x";
    });

    // Handle Email Login / Signup Form Submit
    overlay.querySelector("#email-auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorEl = document.getElementById("auth-form-error");
      errorEl.textContent = "";
      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;

      try {
        const endpoint = isSignupMode ? "/auth/signup" : "/auth/login";
        const payload = {
          email: form.email.value.trim(),
          password: form.password.value,
          ...(isSignupMode ? { username: form.username.value.trim() } : {})
        };

        const data = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(payload)
        });

        setToken(data.access_token);
        currentUser = data.user;
        closeModal();
        renderBadge();
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        submitBtn.disabled = false;
      }
    });

    renderGoogleButtons();
  }

  function loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function renderGoogleButtons() {
    try {
      await loadGoogleScript();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });

      const slot = document.getElementById("google-btn-slot");
      if (slot) {
        window.google.accounts.id.renderButton(slot, {
          theme: "filled_black",
          size: "large",
          width: 376,
          shape: "pill",
          text: "continue_with"
        });
      }
    } catch (e) {
      console.warn("Google OAuth setup failed or offline:", e);
    }
  }

  async function handleGoogleCredential(response) {
    try {
      const data = await apiFetch("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });
      setToken(data.access_token);
      currentUser = data.user;
      closeModal();
      renderBadge();
    } catch (err) {
      const errorEl = document.getElementById("auth-form-error");
      if (errorEl) errorEl.textContent = err.message;
    }
  }

  function openModal() {
    buildModal();
    const overlay = document.getElementById("auth-modal-overlay");
    if (overlay) overlay.classList.add("open");
  }

  function closeModal() {
    const overlay = document.getElementById("auth-modal-overlay");
    if (overlay) overlay.classList.remove("open");
  }

  function logout() {
    clearToken();
    currentUser = null;
    renderBadge();
  }

  function renderBadge() {
    const root = document.getElementById("account-badge-root");
    if (!root) return;

    if (!currentUser) {
      root.innerHTML = '<button class="auth-signin-btn" id="auth-open-login">Sign In</button>';
      root.querySelector("#auth-open-login").addEventListener("click", openModal);
      return;
    }

    const avatarHtml = currentUser.picture_url
      ? `<img class="account-badge__avatar" src="${escapeHtml(currentUser.picture_url)}" alt="" referrerpolicy="no-referrer" />`
      : `<div class="account-badge__avatar"></div>`;

    root.innerHTML = `
      <div style="position:relative">
        <div class="account-badge" id="account-badge-trigger">
          ${avatarHtml}
          <div class="account-badge__info">
            <span class="account-badge__name">${escapeHtml(currentUser.username || "Racer")}</span>
            <span class="account-badge__tier">PRO</span>
          </div>
          <span class="account-badge__chevron">&#9662;</span>
        </div>
        <div class="account-menu" id="account-menu">
          <a href="/profile" class="account-menu__item" style="text-decoration:none; color:inherit; display:block;">User Profile</a>
          <div class="account-menu__item" id="account-menu-logout">Log out</div>
        </div>
      </div>
    `;

    const trigger = root.querySelector("#account-badge-trigger");
    const menu = root.querySelector("#account-menu");
    trigger.addEventListener("click", () => menu.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) menu.classList.remove("open");
    });
    root.querySelector("#account-menu-logout").addEventListener("click", logout);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function init() {
    // Capture token if redirected back from Discord or X OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");

    if (urlToken) {
      setToken(urlToken);

      const cleanUrl =
        window.location.pathname +
        window.location.hash;

      window.history.replaceState({}, document.title, cleanUrl);
    }

    const token = getToken();

    if (token) {
      try {
        currentUser = await apiFetch("/auth/me");
      } catch (e) {
        clearToken();
        currentUser = null;
      }
    }

    renderBadge();
  }

  return { init, openModal, logout, getToken, getCurrentUser: () => currentUser };
})();

document.addEventListener("DOMContentLoaded", () => Auth.init());