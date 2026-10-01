import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { forgotPassword } from "./auth.api";
import "./auth.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      // Backend always returns the same message whether or not the
      // account exists, so this doesn't reveal anything either way.
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
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
          ACCESS RECOVERY
        </div>

        <div className="auth-heading auth-heading-email">
          <span className="auth-kicker">RACE REPLAY / RECOVERY</span>
          <h1>RESET PASSWORD</h1>
          <p>
            Enter the email on your account and we'll send you a link
            to reset your password.
          </p>
        </div>

        {sent ? (
          <>
            <div className="auth-error" role="status" style={{ borderColor: "var(--success, #3fbf7f)", color: "var(--success, #3fbf7f)" }}>
              If an account exists with that email, a reset link has
              been sent. Check your inbox (and spam folder).
            </div>

            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate("/login")}
            >
              <span>BACK TO LOGIN</span>
              <b>→</b>
            </button>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">@</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              <span>{isLoading ? "SENDING..." : "SEND RESET LINK"}</span>
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