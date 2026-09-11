import {
  CheckCircle2,
  CircleOff,
  Crown,
  Flag,
  LoaderCircle,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  getProfile,
  updateProfile,
  type UserProfile,
} from "./auth.api";

import "./profile.css";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

export default function ProfilePage() {
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

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getProfile();

        setProfile(data);
        setUsername(data.username);
        setFavoriteDriver(
          data.favorite_driver ?? "",
        );
        setFavoriteTeam(
          data.favorite_team ?? "",
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

      if (!cleanUsername) {
        setError("Username cannot be empty.");
        setSaving(false);
        return;
      }

      await updateProfile({
        username: cleanUsername,
        ...(cleanFavoriteDriver
          ? {
              favorite_driver:
                cleanFavoriteDriver,
            }
          : {}),
        ...(cleanFavoriteTeam
          ? {
              favorite_team:
                cleanFavoriteTeam,
            }
          : {}),
      });

      setProfile((current) =>
        current
          ? {
              ...current,
              username: cleanUsername,
              favorite_driver:
                cleanFavoriteDriver ||
                current.favorite_driver,
              favorite_team:
                cleanFavoriteTeam ||
                current.favorite_team,
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

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-page-glow" />

        <section className="profile-loading">
          <LoaderCircle
            className="profile-spinner"
            size={30}
          />

          <span className="profile-section-label">
            ACCOUNT / PROFILE
          </span>

          <h1>Loading profile...</h1>

          <p>
            Retrieving your F1 Race Replay
            account.
          </p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <div className="profile-page-glow" />

        <section className="profile-error-state">
          <CircleOff size={34} />

          <span className="profile-section-label">
            ACCOUNT / PROFILE
          </span>

          <h1>Profile unavailable.</h1>

          <p>
            {error ||
              "Unable to load your profile."}
          </p>
        </section>
      </main>
    );
  }

  const displayName =
    profile.username?.trim() || "Driver";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <main className="profile-page">
      <div className="profile-page-glow" />

      <div className="profile-shell">

        {/* PAGE HEADER */}

        <header className="profile-header">
          <div>
            <span className="profile-kicker">
              ACCOUNT / PROFILE
            </span>

            <h1>
              {displayName}
              <span>.</span>
            </h1>

            <p>
              Your F1 Race Replay identity,
              preferences and account details.
            </p>
          </div>
        </header>


        {/* PROFILE HERO */}

        <section className="profile-card profile-hero">
          <div className="profile-hero-main">

            <div className="profile-avatar">
              {profile.picture_url ? (
                <img
                  src={profile.picture_url}
                  alt=""
                />
              ) : (
                <span>
                  {initials}
                </span>
              )}
            </div>

            <div className="profile-identity">
              <span className="profile-card-label">
                DRIVER PROFILE
              </span>

              <h2>
                {displayName}
              </h2>

              {profile.email && (
                <div className="profile-email">
                  <Mail size={15} />
                  <span>
                    {profile.email}
                  </span>
                </div>
              )}
            </div>

          </div>

          <div className="profile-membership">
            {profile.is_pro ? (
              <>
                <Crown size={17} />
                <span>PRO MEMBER</span>
              </>
            ) : (
              <>
                <UserRound size={17} />
                <span>FREE MEMBER</span>
              </>
            )}
          </div>
        </section>


        {/* ACCOUNT OVERVIEW */}

        <section className="profile-section">

          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                ACCOUNT OVERVIEW
              </span>

              <h2>
                Your account
              </h2>
            </div>

            <ShieldCheck size={20} />
          </div>

          <div className="profile-stat-grid">

            <div className="profile-stat-card">
              <span>
                REPLAYS WATCHED
              </span>

              <strong>
                {profile.replays_watched}
              </strong>

              <small>
                Recorded on your account
              </small>
            </div>

            <div className="profile-stat-card">
              <span>
                MEMBERSHIP
              </span>

              <strong>
                {profile.is_pro
                  ? "PRO"
                  : "FREE"}
              </strong>

              <small>
                Current account status
              </small>
            </div>

          </div>
        </section>


        {/* F1 IDENTITY */}

        <section className="profile-section">

          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                F1 IDENTITY
              </span>

              <h2>
                Your preferences
              </h2>
            </div>

            <Flag size={20} />
          </div>

          <div className="profile-identity-grid">

            <div className="profile-preference-card">
              <span>
                FAVORITE DRIVER
              </span>

              <strong>
                {profile.favorite_driver ||
                  "Not set"}
              </strong>
            </div>

            <div className="profile-preference-card">
              <span>
                FAVORITE TEAM
              </span>

              <strong>
                {profile.favorite_team ||
                  "Not set"}
              </strong>
            </div>

          </div>
        </section>


        {/* CONNECTED ACCOUNTS */}

        <section className="profile-section">

          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                CONNECTIONS
              </span>

              <h2>
                Connected accounts
              </h2>
            </div>
          </div>

          <div className="profile-connections">

            <ConnectionRow
              name="Google"
              connected={
                profile.connected_accounts
                  .google
              }
            />

            <ConnectionRow
              name="Discord"
              connected={
                profile.connected_accounts
                  .discord
              }
            />

            <ConnectionRow
              name="X"
              connected={
                profile.connected_accounts
                  .x
              }
            />

          </div>
        </section>


        {/* EDIT PROFILE */}

        <section className="profile-section">

          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                PROFILE SETTINGS
              </span>

              <h2>
                Edit profile
              </h2>
            </div>
          </div>

          <form
            className="profile-form"
            onSubmit={handleSubmit}
          >

            <label className="profile-field">
              <span>
                USERNAME
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


            <label className="profile-field">
              <span>
                EMAIL
              </span>

              <input
                type="email"
                value={profile.email ?? ""}
                disabled
              />

              <small>
                Email is managed by your
                authentication provider.
              </small>
            </label>


            <div className="profile-form-grid">

              <label className="profile-field">
                <span>
                  FAVORITE DRIVER
                </span>

                <input
                  type="text"
                  value={favoriteDriver}
                  onChange={(event) =>
                    setFavoriteDriver(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label className="profile-field">
                <span>
                  FAVORITE TEAM
                </span>

                <input
                  type="text"
                  value={favoriteTeam}
                  onChange={(event) =>
                    setFavoriteTeam(
                      event.target.value,
                    )
                  }
                />
              </label>

            </div>


            {error && (
              <div className="profile-form-error">
                {error}
              </div>
            )}


            {message && (
              <div className="profile-form-success">
                <CheckCircle2 size={16} />
                <span>
                  {message}
                </span>
              </div>
            )}


            <div className="profile-form-actions">

              <button
                type="submit"
                className="profile-save-button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="profile-button-spinner"
                    />

                    SAVING...
                  </>
                ) : (
                  <>
                    <Save size={17} />

                    SAVE PROFILE
                  </>
                )}
              </button>

            </div>

          </form>
        </section>


        {/* SECURITY */}

        <section className="profile-section">

          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                ACCOUNT SECURITY
              </span>

              <h2>
                Authentication
              </h2>
            </div>

            <ShieldCheck size={20} />
          </div>

          <div className="profile-security-card">

            <div>
              <strong>
                Account protection
              </strong>

              <p>
                Your account uses the
                authentication methods connected
                above.
              </p>
            </div>

            <ShieldCheck size={22} />

          </div>
        </section>


        <footer className="profile-footer">
          <span>
            F1 RACE REPLAY
          </span>

          <span>
            PROFILE
          </span>
        </footer>

      </div>
    </main>
  );
}


type ConnectionRowProps = {
  name: string;
  connected: boolean;
};


function ConnectionRow({
  name,
  connected,
}: ConnectionRowProps) {
  return (
    <div className="profile-connection-row">

      <div className="profile-connection-name">
        <span className="profile-connection-icon">
          {name.slice(0, 1)}
        </span>

        <span>
          {name}
        </span>
      </div>

      <div
        className={
          connected
            ? "profile-connection-status is-connected"
            : "profile-connection-status"
        }
      >
        {connected ? (
          <>
            <CheckCircle2 size={15} />
            CONNECTED
          </>
        ) : (
          <>
            <CircleOff size={15} />
            NOT CONNECTED
          </>
        )}
      </div>

    </div>
  );
}
