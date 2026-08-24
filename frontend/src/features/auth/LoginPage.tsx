import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { useAuthStore } from "./auth.store";

import "./auth.css";

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore(
    (state) => state.isLoading,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in.",
      );
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page-glow" />

      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            F1
          </span>

          <span className="auth-brand-name">
            RACE REPLAY
          </span>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            ACCOUNT / 01
          </span>

          <h1>Welcome back.</h1>

          <p>
            Sign in to continue your F1 Race
            Replay experience.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Email</span>

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
          </label>

          <label className="auth-field">
            <span>Password</span>

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
            {isLoading
              ? "SIGNING IN..."
              : "SIGN IN"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <small>OR</small>
          <span />
        </div>

        <button
          type="button"
          className="auth-google"
          disabled
          title="Google login will be connected next"
        >
          CONTINUE WITH GOOGLE
        </button>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}