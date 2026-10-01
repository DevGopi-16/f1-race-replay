import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { verifyEmail } from "./auth.api";
import "./auth.css";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token.");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "This verification link is invalid or has expired.",
        );
      });
  }, [token]);

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
          EMAIL VERIFICATION
        </div>

        <div className="auth-heading auth-heading-email">
          <span className="auth-kicker">RACE REPLAY / ACCOUNT</span>
          <h1>VERIFY EMAIL</h1>
        </div>

        {status === "verifying" && (
          <p style={{ textAlign: "center" }}>Verifying your email...</p>
        )}

        {status === "success" && (
          <>
            <div
              className="auth-error"
              role="status"
              style={{ borderColor: "var(--success, #3fbf7f)", color: "var(--success, #3fbf7f)" }}
            >
              Your email has been verified.
            </div>

            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate("/")}
            >
              <span>CONTINUE</span>
              <b>→</b>
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="auth-error" role="alert">
              {error}
            </div>

            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate("/profile")}
            >
              <span>GO TO PROFILE</span>
              <b>→</b>
            </button>
          </>
        )}

        <button
          type="button"
          className="auth-back-login"
          onClick={() => navigate("/")}
        >
          ← BACK TO HOME
        </button>
      </section>

      <div className="auth-bottom-grid" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
    </main>
  );
}