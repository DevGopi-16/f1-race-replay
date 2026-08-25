import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "./auth.store";

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
        const params = new URLSearchParams(
          window.location.search,
        );

        const accessToken =
          params.get("access_token");

        const oauthError =
          params.get("error");

        if (oauthError) {
          throw new Error(
            "Discord authorization was cancelled.",
          );
        }

        if (!accessToken) {
          throw new Error(
            "Discord did not return an access token.",
          );
        }

        localStorage.setItem(
          "f1_access_token",
          accessToken,
        );

        await restoreSession();

        if (!cancelled) {
          navigate("/", {
            replace: true,
          });
        }
      } catch (err) {
        console.error(
          "[Auth] Discord callback failed:",
          err,
        );

        localStorage.removeItem(
          "f1_access_token",
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