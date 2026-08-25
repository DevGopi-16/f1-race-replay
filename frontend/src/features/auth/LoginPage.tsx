import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAuthStore } from "./auth.store";

import "./auth.css";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: {
              credential: string;
            }) => void;
          }) => void;

          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?:
                | "signin_with"
                | "signup_with"
                | "continue_with"
                | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  "3151390342-jd4omku90qolovv44dsjph7a5v7sj2b7.apps.googleusercontent.com";

export default function LoginPage() {
  const navigate = useNavigate();

  const login = useAuthStore(
    (state) => state.login,
  );

  const googleLogin = useAuthStore(
    (state) => state.googleLogin,
  );

  const isLoading = useAuthStore(
    (state) => state.isLoading,
  );

  const googleButtonRef =
    useRef<HTMLDivElement | null>(null);

  const [showEmailLogin, setShowEmailLogin] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!window.google) {
      console.warn(
        "[Auth] Google Identity Services has not loaded.",
      );

      return;
    }

    if (!googleButtonRef.current) {
      return;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,

      callback: async (response) => {
        setError("");

        if (!response.credential) {
          setError(
            "Google did not return a valid credential.",
          );

          return;
        }

        try {
          await googleLogin({
            credential: response.credential,
          });

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
      },
    });

    window.google.accounts.id.renderButton(
      googleButtonRef.current,
      {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 360,
        logo_alignment: "left",
      },
    );

    console.log(
      "[Auth] Google Sign-In button initialized.",
    );
  }, [googleLogin, navigate]);

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
        <div
          className="auth-logo"
          aria-label="F1 Race Replay"
        >
          <span className="auth-logo-f">
            F
          </span>

          <span className="auth-logo-plus">
            +
          </span>
        </div>

        <div className="auth-brand-text">
          <strong>
            RACE REPLAY
          </strong>

          <span>
            F1 RACING ANALYTICS
          </span>
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

              <h1>
                AUTHENTICATE
              </h1>

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
              <div className="auth-provider auth-provider-google">
                <span className="auth-provider-icon google-icon">
                  G
                </span>

                <span className="auth-google-button-area">
                  <span
                    ref={googleButtonRef}
                    className="auth-google-render"
                  />
                </span>
              </div>
              <button
                type="button"
                className="auth-provider"
                onClick={() => {
                  window.location.href =
                    "http://127.0.0.1:8000/auth/discord/login";
                }}
              >
                <span className="auth-provider-icon discord-icon">
                  ◉
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
                disabled
                title="X login will be connected next"
              >
                <span className="auth-provider-icon x-icon">
                  𝕏
                </span>

                <span>
                  Continue with X
                </span>

                <span className="auth-provider-status">
                  SOON
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

              <small>
                SECURE ACCESS
              </small>

              <span />
            </div>

            <div className="auth-terms">
              By signing in, you agree to our{" "}
              <a href="#terms">
                Terms
              </a>
              {" "}and{" "}
              <a href="#privacy">
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

              <h1>
                SIGN IN
              </h1>

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
                <span>
                  Email
                </span>

                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    @
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>
                  Password
                </span>

                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    •
                  </span>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

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

                {!isLoading && (
                  <b>
                    →
                  </b>
                )}
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