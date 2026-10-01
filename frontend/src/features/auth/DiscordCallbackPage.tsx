import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useAuthStore } from "./auth.store";

function describeDiscordError(code: string): string {
  switch (code) {
    case "email_already_registered":
      return (
        "An account with this email already exists. Log in with " +
        "your password and verify your email, or use a different " +
        "sign-in method."
      );
    case "missing_code":
    case "missing_state":
    case "invalid_state":
      return "Discord authorization failed. Please try again.";
    case "discord_secret_not_configured":
      return "Discord sign-in isn't available right now.";
    case "discord_token_request_failed":
    case "discord_token_exchange_failed":
    case "invalid_discord_token_response":
    case "discord_user_fetch_failed":
    case "invalid_discord_user_response":
    case "missing_discord_id":
      return "Something went wrong connecting to Discord. Please try again.";
    case "access_denied":
      return "Discord authorization was cancelled.";
    default:
      return "Unable to complete Discord login.";
  }
}

export default function DiscordCallbackPage() {
  const navigate = useNavigate();

  const restoreSession = useAuthStore(
    (state) => state.restoreSession,
  );

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeDiscordLogin() {
      try {
        /*
         * Discord backend redirects with:
         *
         * The backend sets the session cookie before redirecting
         * to this page, so the browser sends it automatically.
         */

        const searchParams = new URLSearchParams(
          window.location.search,
        );

        const oauthError =
          searchParams.get("error") ??
          new URLSearchParams(
            window.location.hash.replace(/^#/, ""),
          ).get("error");

        if (oauthError) {
          throw new Error(
            describeDiscordError(oauthError),
          );
        }

        await restoreSession();

        if (!cancelled) {
          /*
           * Remove the token from the browser URL after
           * successful authentication.
           */

          window.history.replaceState(
            null,
            "",
            window.location.pathname,
          );

          navigate("/", {
            replace: true,
          });
        }
      } catch (err) {
        console.error(
          "[Auth] Discord callback failed:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to complete Discord login.",
          );
        }
      }
    }

    void completeDiscordLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate, restoreSession]);

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#050505",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "monospace",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "40px",
            background: "#0b0b0b",
            border: "1px solid #292929",
          }}
        >
          <div
            style={{
              color: "#ff2337",
              fontSize: "12px",
              letterSpacing: "0.16em",
              marginBottom: "16px",
            }}
          >
            DISCORD AUTHENTICATION
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              letterSpacing: "0.04em",
            }}
          >
            AUTHENTICATION FAILED
          </h1>

          <p
            style={{
              color: "#999",
              lineHeight: 1.7,
              marginTop: "20px",
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login", {
                replace: true,
              })
            }
            style={{
              marginTop: "20px",
              padding: "14px 20px",
              background: "#e10600",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
            }}
          >
            BACK TO LOGIN
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
      }}
    >
      <section
        style={{
          textAlign: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            border: "2px solid #333",
            borderTopColor: "#e10600",
            borderRadius: "50%",
            margin: "0 auto 24px",
            animation:
              "discord-auth-spin 0.8s linear infinite",
          }}
        />

        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.18em",
            color: "#888",
          }}
        >
          DISCORD AUTHENTICATION
        </div>

        <h1
          style={{
            marginTop: "12px",
            fontSize: "28px",
          }}
        >
          CONNECTING...
        </h1>

        <p
          style={{
            color: "#777",
          }}
        >
          Preparing your F1 Race Replay account.
        </p>
      </section>

      <style>
        {`
          @keyframes discord-auth-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </main>
  );
}