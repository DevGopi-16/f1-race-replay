import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { useAuthStore } from "./auth.store";

import "./auth.css";

export default function RegisterPage() {
  const signup = useAuthStore(
    (state) => state.signup,
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading,
  );

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    try {
      await signup({
        username: username.trim(),
        email: email.trim(),
        password,
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
      <div className="auth-page-glow" />

      <section className="auth-card auth-card-register">
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
            ACCOUNT / 02
          </span>

          <h1>Create account.</h1>

          <p>
            Build your personal F1 Race Replay
            experience.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Username</span>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Your username"
              autoComplete="username"
              required
            />
          </label>

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
              placeholder="Create a password"
              autoComplete="new-password"
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
              ? "CREATING ACCOUNT..."
              : "CREATE ACCOUNT"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}