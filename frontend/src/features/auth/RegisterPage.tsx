import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "./auth.store";
import "./auth.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await signup({
        username: username.trim(),
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
          : "Unable to create your account.",
      );
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="auth-grid" />
        <div className="auth-light auth-light-one" />
        <div className="auth-light auth-light-two" />
      </div>

      <div className="auth-top-brand">
        <div className="auth-logo">
          <span className="auth-logo-f">F1</span>
          <span className="auth-logo-plus">+</span>
        </div>

        <div className="auth-brand-text">
          <strong>RACE</strong>
          <span>REPLAY</span>
        </div>
      </div>

      <section className="auth-card">
        <div className="auth-card-line" />

        <div className="auth-status">
          <span className="auth-status-dot" />
          NEW DRIVER REGISTRATION
        </div>

        <div className="auth-heading">
          <h1>CREATE ACCOUNT</h1>

          <p>
            Join the race and unlock live data,
            predictions, and private leagues.
          </p>

          <span className="auth-subline">
            Free to join · No credit card required
          </span>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Username</span>

            <div className="auth-input-wrap">
              <span className="auth-input-icon">@</span>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Choose your username"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Email</span>

            <div className="auth-input-wrap">
              <span className="auth-input-icon">@</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>

            <div className="auth-input-wrap">
              <span className="auth-input-icon">◈</span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </div>
          </label>

          {error && (
            <div className="auth-error">
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
                ? "CREATING ACCOUNT..."
                : "CREATE ACCOUNT"}
            </span>

            <b>→</b>
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <small>OR</small>
          <span />
        </div>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>

        <div className="auth-back">
          <Link to="/">
            ← BACK TO HOME
          </Link>
        </div>
      </section>

      <div className="auth-racing-stripe">
        {Array.from({ length: 55 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    </main>
  );
}