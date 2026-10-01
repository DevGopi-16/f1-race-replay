import {
  FormEvent,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./auth.store";
import "./auth.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setError("");

    try {
      await googleLogin();

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in with Google.",
      );
    }
  };

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    try {
      await login({
        email: email.trim(),
        password,
      });

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in.",
      );
    }
  }

  function openEmailLogin() {
    setError("");
    setShowEmailLogin(true);
  }

  function backToOptions() {
    setError("");
    setShowEmailLogin(false);
  }

  return (
    <main className="auth-page">
      <div
        className="auth-background"
        aria-hidden="true"
      >
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="auth-grid" />
        <div className="auth-light auth-light-one" />
        <div className="auth-light auth-light-two" />
      </div>

      <header className="auth-top-brand">
        <img
          src="/images/logo-without-bg/favicon-removebg-preview.png"
          alt="F1 Race Replay"
          className="auth-brand-logo"
        />

        <div className="auth-brand-text">
          <strong>RACE REPLAY</strong>
          <span>F1 RACING ANALYTICS</span>
        </div>
      </header>

      <section className="auth-card">
        <div className="auth-card-line" />

        {!showEmailLogin ? (
          <>
            <div className="auth-status">
              <span className="auth-status-dot" />
              ACCESS TERMINAL
            </div>

            <div className="auth-heading">
              <span className="auth-kicker">
                RACE REPLAY / ACCOUNT
              </span>

              <h1>AUTHENTICATE</h1>

              <p>
                Secure your access to race data,
                predictions, replays, and private
                leagues.
              </p>

              <span className="auth-subline">
                Free to join · No credit card required
              </span>
            </div>

            <div className="auth-provider-list">
              <button
                type="button"
                className="auth-provider"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <span className="auth-provider-icon google-icon">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.23c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.5Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.54 13.59A5.86 5.86 0 0 1 6.23 12c0-.55.11-1.09.31-1.59V7.88H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.12l3.24-2.53Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.38c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.51 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.7 5.38l3.24 2.53C7.31 8.1 9.46 6.38 12 6.38Z"
                    />
                  </svg>
                </span>

                <span>
                  Continue with Google
                </span>

                <span className="auth-provider-arrow">
                  →
                </span>
              </button>

              <button
                type="button"
                className="auth-provider"
                onClick={() => {
                  window.location.href =
                    "http://127.0.0.1:8000/auth/discord/login";
                }}
              >
                <span className="auth-provider-icon discord-icon">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="currentColor"
                      d="M19.54 0c1.1 0 2 .9 2 2v20c0 1.1-.9 2-2 2H4.46c-1.1 0-2-.9-2-2V2c0-1.1.9-2 2-2h15.08ZM17.8 15.3c.02-.03.03-.05.04-.08 1.2-.89 2.1-2.08 2.58-3.46-.32-2.35-1.3-4.68-2.87-6.76a10.25 10.25 0 0 0-2.9-.88l-.4.82a10.9 10.9 0 0 0-4.5 0l-.4-.82a10.25 10.25 0 0 0-2.9.88C4.88 7.08 3.9 9.41 3.58 11.76c.48 1.38 1.38 2.57 2.58 3.46.01.03.02.05.04.08.73.55 1.55.98 2.43 1.27l.6-.82c-.7-.25-1.36-.6-1.95-1.03l.48-.36c1.84 1.36 4.28 1.36 6.12 0l.48.36c-.59.43-1.25.78-1.95 1.03l.6.82c.88-.29 1.7-.72 2.43-1.27ZM9.1 11.2c-.67 0-1.2-.62-1.2-1.38s.54-1.38 1.2-1.38 1.2.62 1.2 1.38-.54 1.38-1.2 1.38Zm5.8 0c-.67 0-1.2-.62-1.2-1.38s.54-1.38 1.2-1.38 1.2.62 1.2 1.38-.54 1.38-1.2 1.38Z"
                    />
                  </svg>
                </span>

                <span>
                  Continue with Discord
                </span>

                <span className="auth-provider-arrow">
                  →
                </span>
              </button>

              <button
                type="button"
                className="auth-provider"
                onClick={() => {
                  window.location.href =
                    "http://127.0.0.1:8000/auth/x/login";
                }}
              >
                <span className="auth-provider-icon x-icon">
                  𝕏
                </span>

                <span>
                  Continue with X
                </span>

                <span className="auth-provider-arrow">
                  →
                </span>
              </button>

              <button
                type="button"
                className="auth-provider auth-provider-email"
                onClick={openEmailLogin}
                disabled={isLoading}
              >
                <span className="auth-provider-icon email-icon">
                  @
                </span>

                <span>
                  Sign in with Email / Password
                </span>

                <span className="auth-provider-arrow">
                  →
                </span>
              </button>
            </div>

            {error && (
              <div
                className="auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="auth-divider">
              <span />
              <small>SECURE ACCESS</small>
              <span />
            </div>

            <div className="auth-terms">
              By signing in, you agree to our{" "}
              <a href="/terms" target="_blank" rel="noreferrer">Terms</a>{" "}
              and{" "}
              <a href="/privacy-policy" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="auth-status">
              <span className="auth-status-dot" />
              SECURE LOGIN
            </div>

            <div className="auth-heading auth-heading-email">
              <span className="auth-kicker">
                RACE REPLAY / EMAIL
              </span>

              <h1>SIGN IN</h1>

              <p>
                Enter your credentials to access
                your Race Replay account.
              </p>
            </div>

            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >
              <label className="auth-field">
                <span>Email</span>

                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    @
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>Password</span>

                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    •
                  </span>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              <button
                type="button"
                className="auth-back-login"
                style={{ textAlign: "right", marginTop: "-8px" }}
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </button>

              {error && (
                <div
                  className="auth-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={isLoading}
              >
                <span>
                  {isLoading
                    ? "AUTHENTICATING..."
                    : "AUTHENTICATE"}
                </span>

                {!isLoading && <b>→</b>}
              </button>
            </form>

            <button
              type="button"
              className="auth-back-login"
              onClick={backToOptions}
            >
              ← BACK TO LOGIN OPTIONS
            </button>
          </>
        )}

        <button
          type="button"
          className="auth-home"
          onClick={() => navigate("/")}
        >
          ← BACK TO HOME
        </button>
      </section>

      <div
        className="auth-bottom-grid"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}