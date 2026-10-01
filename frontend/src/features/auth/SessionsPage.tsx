import { useEffect, useState } from "react";

import { getSessions, revokeSession, type UserSession } from "./auth.api";
import "./auth.css";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown";

  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState<number | null>(null);

  async function loadSessions() {
    setError("");
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your sessions.",
      );
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleRevoke(sessionId: number) {
    setRevokingId(sessionId);
    setError("");

    try {
      await revokeSession(sessionId);
      setSessions(
        (current) =>
          current?.filter((s) => s.id !== sessionId) ?? null,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to revoke that session.",
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="auth-sessions-page">
      <div className="auth-heading auth-heading-email">
        <span className="auth-kicker">RACE REPLAY / ACCOUNT</span>
        <h1>ACTIVE SESSIONS</h1>
        <p>
          These are the devices currently signed in to your account.
          Revoke any you don't recognize.
        </p>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      {sessions === null && !error && (
        <p style={{ color: "#888" }}>Loading sessions...</p>
      )}

      {sessions !== null && sessions.length === 0 && (
        <p style={{ color: "#888" }}>No active sessions found.</p>
      )}

      {sessions !== null && sessions.length > 0 && (
        <ul className="auth-session-list">
          {sessions.map((session) => (
            <li key={session.id} className="auth-session-row">
              <div className="auth-session-info">
                <div className="auth-session-device">
                  {session.device}
                  {session.is_current && (
                    <span className="auth-session-badge">
                      THIS DEVICE
                    </span>
                  )}
                </div>

                <div className="auth-session-meta">
                  Signed in {formatRelativeTime(session.signed_in_at)}
                  {" · "}
                  Last active {formatRelativeTime(session.last_active_at)}
                  {session.ip_address && (
                    <>
                      {" · "}
                      {session.ip_address}
                    </>
                  )}
                </div>
              </div>

              {!session.is_current && (
                <button
                  type="button"
                  className="auth-session-revoke"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? "Revoking..." : "Revoke"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}