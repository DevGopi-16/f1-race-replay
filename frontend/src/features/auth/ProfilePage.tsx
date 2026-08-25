import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  getProfile,
  updateProfile,
  type UserProfile,
} from "./auth.api";

import "./auth.css";

export default function ProfilePage() {
  /* =========================================================
     STATE
  ========================================================= */

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [username, setUsername] =
    useState("");

  const [favoriteDriver, setFavoriteDriver] =
    useState("");

  const [favoriteTeam, setFavoriteTeam] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getProfile();

        setProfile(data);

        setUsername(data.username);

        setFavoriteDriver(
          data.favorite_driver,
        );

        setFavoriteTeam(
          data.favorite_team,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const cleanUsername =
        username.trim();

      const cleanFavoriteDriver =
        favoriteDriver.trim();

      const cleanFavoriteTeam =
        favoriteTeam.trim();

      await updateProfile({
        username: cleanUsername,
        favorite_driver:
          cleanFavoriteDriver,
        favorite_team:
          cleanFavoriteTeam,
      });

      setProfile((current) =>
        current
          ? {
              ...current,

              username:
                cleanUsername,

              favorite_driver:
                cleanFavoriteDriver,

              favorite_team:
                cleanFavoriteTeam,
            }
          : current,
      );

      setUsername(cleanUsername);

      setFavoriteDriver(
        cleanFavoriteDriver,
      );

      setFavoriteTeam(
        cleanFavoriteTeam,
      );

      setMessage(
        "Profile updated successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-page-glow" />

        <section className="auth-card">
          <div className="auth-heading">
            <span className="auth-eyebrow">
              ACCOUNT / PROFILE
            </span>

            <h1>
              Loading profile...
            </h1>

            <p>
              Retrieving your F1 Race Replay
              account.
            </p>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================================
     PROFILE ERROR
  ========================================================= */

  if (!profile) {
    return (
      <main className="auth-page">
        <div className="auth-page-glow" />

        <section className="auth-card">
          <div className="auth-heading">
            <span className="auth-eyebrow">
              ACCOUNT / PROFILE
            </span>

            <h1>
              Profile unavailable.
            </h1>

            <p>
              {error ||
                "Unable to load your profile."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================================
     DISPLAY DATA
  ========================================================= */

  const displayName =
    profile.username || "Driver";

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="auth-page">
      <div className="auth-page-glow" />

      <section className="auth-card auth-card-register">

        {/* =================================================
            BRAND
        ================================================= */}

        <div className="auth-brand">
          <span className="auth-brand-mark">
            F1
          </span>

          <span className="auth-brand-name">
            RACE REPLAY
          </span>
        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="auth-heading">
          <span className="auth-eyebrow">
            ACCOUNT / PROFILE
          </span>

          <h1>
            {displayName}.
          </h1>

          <p>
            Manage your F1 Race Replay
            driver profile.
          </p>
        </div>

        {/* =================================================
            AVATAR
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "28px",
          }}
        >
          {profile.picture_url ? (
            <img
              src={profile.picture_url}
              alt=""
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 700,
                background: "#151515",
                border: "1px solid #333",
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              padding: "16px",
              background: "#111",
              border: "1px solid #252525",
            }}
          >
            <small>
              REPLAYS WATCHED
            </small>

            <strong
              style={{
                display: "block",
                marginTop: "6px",
                fontSize: "24px",
              }}
            >
              {profile.replays_watched}
            </strong>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#111",
              border: "1px solid #252525",
            }}
          >
            <small>
              MEMBERSHIP
            </small>

            <strong
              style={{
                display: "block",
                marginTop: "6px",
                fontSize: "24px",
              }}
            >
              {profile.is_pro
                ? "PRO"
                : "FREE"}
            </strong>
          </div>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {/* USERNAME */}

          <label className="auth-field">
            <span>
              Username
            </span>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value,
                )
              }
              autoComplete="username"
              required
            />
          </label>

          {/* EMAIL */}

          <label className="auth-field">
            <span>
              Email
            </span>

            <input
              type="email"
              value={
                profile.email ?? ""
              }
              disabled
            />
          </label>

          {/* FAVORITE DRIVER */}

          <label className="auth-field">
            <span>
              Favorite Driver
            </span>

            <input
              type="text"
              value={favoriteDriver}
              onChange={(event) =>
                setFavoriteDriver(
                  event.target.value,
                )
              }
              placeholder="e.g. Lando Norris"
            />
          </label>

          {/* FAVORITE TEAM */}

          <label className="auth-field">
            <span>
              Favorite Team
            </span>

            <input
              type="text"
              value={favoriteTeam}
              onChange={(event) =>
                setFavoriteTeam(
                  event.target.value,
                )
              }
              placeholder="e.g. McLaren"
            />
          </label>

          {/* ERROR */}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div
              style={{
                padding: "12px 14px",
                border:
                  "1px solid #263d2b",
                background: "#101a12",
                color: "#8ee59d",
                fontSize: "13px",
              }}
            >
              {message}
            </div>
          )}

          {/* SAVE */}

          <button
            type="submit"
            className="auth-submit"
            disabled={saving}
          >
            {saving
              ? "SAVING..."
              : "SAVE PROFILE"}
          </button>
        </form>
      </section>
    </main>
  );
}