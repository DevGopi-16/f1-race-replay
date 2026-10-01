import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { resetPassword } from "./auth.api";
import "./auth.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="auth-grid" />
        <div className="auth-light auth-light-one" />
        <div className="auth-light auth-light-two" />
      </div>

      <header className="auth-top-brand">
        <div className="auth-logo" aria-label="F1 Race Replay">
          <span className="auth-logo-f">F</span>
          <span className="auth-logo-plus">+</span>
        </div>

        <div className="auth-brand-text">
          <strong>RACE REPLAY</strong>
          <span>F1 RACING ANALYTICS</span>
        </div>
      </header>

      <section className="auth-card">
        <div className="auth-card-line" />

        <div className="auth-status">
          <span className="auth-status-dot" />
          SECURE RESET
        </div>

        <div className="auth-heading auth-heading-email">
          <span className="auth-kicker">RACE REPLAY / RECOVERY</span>
          <h1>NEW PASSWORD</h1>
          <p>Choose a new password for your account.</p>
        </div>

        {!token ? (
          <div className="auth-error" role="alert">
            This reset link is missing its token. Request a new one
            from the login page.
          </div>
        ) : done ? (
          <>
            <div
              className="auth-error"
              role="status"
              style={{ borderColor: "var(--success, #3fbf7f)", color: "var(--success, #3fbf7f)" }}
            >
              Your password has been reset. You can now sign in with
              your new password.
            </div>

            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate("/login")}
            >
              <span>GO TO LOGIN</span>
              <b>→</b>
            </button>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>New password</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">•</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  autoFocus
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">•</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              <span>{isLoading ? "RESETTING..." : "RESET PASSWORD"}</span>
              {!isLoading && <b>→</b>}
            </button>
          </form>
        )}

        <button
          type="button"
          className="auth-back-login"
          onClick={() => navigate("/login")}
        >
          ← BACK TO LOGIN
        </button>
      </section>

      <div className="auth-bottom-grid" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
    </main>
  );
}