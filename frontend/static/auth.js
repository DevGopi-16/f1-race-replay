const Auth = (() => {
  const API_BASE_URL = "";
  const TOKEN_KEY = "f1_replay_token";
  const GOOGLE_CLIENT_ID = "3151390342-jd4omku90qolovv44dsjph7a5v7sj2b7.apps.googleusercontent.com";

  let currentUser = null;

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
    const overlay = document.createElement("div");
    overlay.className = "auth-modal-overlay";
    overlay.id = "auth-modal-overlay";
    overlay.innerHTML = `
      <div class="auth-modal">
        <button class="auth-modal__close" id="auth-modal-close">&times;</button>
        <div id="auth-modal-login">
          <h2 class="auth-modal__title">Welcome back</h2>
          <p class="auth-modal__subtitle">Log in to your Racer account</p>
          <div id="google-btn-login" class="google-btn-slot"></div>
          <div class="auth-divider"><span>or</span></div>
          <form id="login-form">
            <div class="auth-field">
              <label>Email</label>
              <input type="email" name="email" required autocomplete="email" />
            </div>
            <div class="auth-field">
              <label>Password</label>
              <input type="password" name="password" required autocomplete="current-password" />
            </div>
            <div class="auth-error" id="login-error"></div>
            <button type="submit" class="auth-submit-btn">Log in</button>
          </form>
          <div class="auth-switch">No account? <a id="show-signup">Sign up</a></div>
        </div>
        <div id="auth-modal-signup" style="display:none">
          <h2 class="auth-modal__title">Create your account</h2>
          <p class="auth-modal__subtitle">Join Racer to save replays and track your favorite drivers</p>
          <div id="google-btn-signup" class="google-btn-slot"></div>
          <div class="auth-divider"><span>or</span></div>
          <form id="signup-form">
            <div class="auth-field">
              <label>Username</label>
              <input type="text" name="username" required minlength="3" maxlength="50" autocomplete="username" />
            </div>
            <div class="auth-field">
              <label>Email</label>
              <input type="email" name="email" required autocomplete="email" />
            </div>
            <div class="auth-field">
              <label>Password</label>
              <input type="password" name="password" required minlength="8" autocomplete="new-password" />
            </div>
            <div class="auth-error" id="signup-error"></div>
            <button type="submit" class="auth-submit-btn">Sign up</button>
          </form>
          <div class="auth-switch">Already have an account? <a id="show-login">Log in</a></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#auth-modal-close").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector("#show-signup").addEventListener("click", () => switchModalView("signup"));
    overlay.querySelector("#show-login").addEventListener("click", () => switchModalView("login"));
    overlay.querySelector("#login-form").addEventListener("submit", handleLogin);
    overlay.querySelector("#signup-form").addEventListener("submit", handleSignup);

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
    } catch (e) {
      console.error("Google script failed to load", e);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });

    ["google-btn-login", "google-btn-signup"].forEach(function (id) {
      const slot = document.getElementById(id);
      if (slot) {
        window.google.accounts.id.renderButton(slot, {
          theme: "filled_black",
          size: "large",
          width: 332,
          shape: "pill",
        });
      }
    });
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
      const errorEl = document.getElementById("signup-error") || document.getElementById("login-error");
      if (errorEl) errorEl.textContent = err.message;
    }
  }

  function switchModalView(view) {
    document.getElementById("auth-modal-login").style.display = view === "login" ? "block" : "none";
    document.getElementById("auth-modal-signup").style.display = view === "signup" ? "block" : "none";
  }

  function openModal(view) {
    switchModalView(view || "login");
    document.getElementById("login-error").textContent = "";
    document.getElementById("signup-error").textContent = "";
    document.getElementById("auth-modal-overlay").classList.add("open");
  }

  function closeModal() {
    document.getElementById("auth-modal-overlay").classList.remove("open");
  }

  async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = document.getElementById("login-error");
    errorEl.textContent = "";
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const payload = { email: form.email.value.trim(), password: form.password.value };
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
      setToken(data.access_token);
      currentUser = data.user;
      closeModal();
      renderBadge();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = document.getElementById("signup-error");
    errorEl.textContent = "";
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const payload = {
        username: form.username.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
      };
      const data = await apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
      setToken(data.access_token);
      currentUser = data.user;
      closeModal();
      renderBadge();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
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
      root.innerHTML = '<button class="auth-signin-btn" id="auth-open-login">Sign in</button>';
      root.querySelector("#auth-open-login").addEventListener("click", () => openModal("login"));
      return;
    }

    const avatarHtml = currentUser.picture_url
      ? `<img class="account-badge__avatar" src="${escapeHtml(currentUser.picture_url)}" alt="" referrerpolicy="no-referrer" />`
      : `<div class="account-badge__avatar" style="background:${currentUser.avatar_color}"></div>`;

    root.innerHTML = `
      <div style="position:relative">
        <div class="account-badge" id="account-badge-trigger">
          ${avatarHtml}
          <div class="account-badge__info">
            <span class="account-badge__name">${escapeHtml(currentUser.username)}</span>
            ${currentUser.is_pro ? '<span class="account-badge__tier">PRO</span>' : ""}
          </div>
          <span class="account-badge__chevron">&#9662;</span>
        </div>
        <div class="account-menu" id="account-menu">
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
    buildModal();
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
