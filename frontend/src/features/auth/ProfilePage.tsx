import {
  CheckCircle2,
  CircleOff,
  Crown,
  Flag,
  LoaderCircle,
  Mail,
  Save,
  ShieldCheck,
  Trophy,
  LockKeyhole,
  Eye,
  EyeOff,
  UserRound,
} from "lucide-react";

import {
  getProfile,
  getProfileStats,
  getAchievements,
  getSeasonSummary,
  updateProfile,
  changePassword,
  getUserSettings,
  updateUserSettings,
  connectGoogleAccount,
  disconnectProfileConnection,
  startDiscordConnection,
  type UserProfile,
  type ProfileStats,
  type Achievement,
  type SeasonSummary,
  type UserSettings,
} from "./auth.api";

import { signInWithGoogleFirebase } from "./firebase.auth";

import "./profile.css";
import { saveAppearanceLocally } from "./appearance";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

function formatWatchTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [stats, setStats] =
    useState<ProfileStats | null>(null);

  const [achievements, setAchievements] =
    useState<Achievement[]>([]);

  const [achievementsLoading, setAchievementsLoading] =
    useState(true);

  const [seasonSummary, setSeasonSummary] =
    useState<SeasonSummary | null>(null);

  const [seasonSummaryLoading, setSeasonSummaryLoading] =
    useState(true);

  const [username, setUsername] =
    useState("");

  const [favoriteDriver, setFavoriteDriver] =
    useState("");

  const [favoriteTeam, setFavoriteTeam] =
    useState("");

  const [userSettings, setUserSettings] =
    useState<UserSettings | null>(null);

  const [settingsLoading, setSettingsLoading] =
    useState(true);

  const [settingsSaving, setSettingsSaving] =
    useState(false);

  const [settingsError, setSettingsError] =
    useState("");

  const [settingsMessage, setSettingsMessage] =
    useState("");

  const [defaultDriverComp, setDefaultDriverComp] =
    useState("VER");

  const [units, setUnits] =
    useState("metric");

  const [theme, setTheme] =
    useState("dark");

  const [accentColor, setAccentColor] =
    useState("#e10600");

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [connectionBusy, setConnectionBusy] =
    useState<string | null>(null);

  const [connectionError, setConnectionError] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  async function loadProfile(
    showLoading = true,
  ) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const [data, profileStats] =
        await Promise.all([
          getProfile(),
          getProfileStats(),
        ]);

      setProfile(data);
      setStats(profileStats);

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
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    let active = true;

    setSettingsLoading(true);
    setSettingsError("");

    getUserSettings()
      .then((data) => {
        if (!active) {
          return;
        }

        setUserSettings(data);
        setDefaultDriverComp(data.default_driver_comp || "VER");
        setUnits(data.units || "metric");
        setTheme(data.theme || "dark");
        setAccentColor(data.accent_color || "#e10600");
        setNotificationsEnabled(
          Boolean(data.notifications_enabled),
        );
      })
      .catch((err) => {
        if (active) {
          setSettingsError(
            err instanceof Error
              ? err.message
              : "Unable to load account settings.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setSettingsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getAchievements()
      .then((data) => {
        if (active) {
          setAchievements(data);
        }
      })
      .catch((error) => {
        console.error(
          "[ProfilePage] Failed to load achievements:",
          error,
        );
      })
      .finally(() => {
        if (active) {
          setAchievementsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getSeasonSummary()
      .then((data) => {
        if (active) {
          setSeasonSummary(data);
        }
      })
      .catch((error) => {
        console.error(
          "[ProfilePage] Failed to load season summary:",
          error,
        );
      })
      .finally(() => {
        if (active) {
          setSeasonSummaryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleGoogleConnect() {
    if (connectionBusy) {
      return;
    }

    setConnectionBusy("Google");
    setConnectionError("");
    setError("");
    setMessage("");

    try {
      const { idToken } =
        await signInWithGoogleFirebase();

      await connectGoogleAccount(idToken);

      await loadProfile(false);

      setMessage(
        "Google account connected successfully.",
      );
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? err.message
          : "Unable to connect Google account.",
      );
    } finally {
      setConnectionBusy(null);
    }
  }

  async function handleDiscordConnect() {
    if (connectionBusy) {
      return;
    }

    setConnectionBusy("Discord");
    setConnectionError("");
    setError("");
    setMessage("");

    try {
      await startDiscordConnection();
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? err.message
          : "Unable to connect Discord account.",
      );
      setConnectionBusy(null);
    }
  }

  async function handleDisconnect(
    provider: "google" | "discord" | "x",
  ) {
    if (connectionBusy) {
      return;
    }

    const displayName =
      provider === "google"
        ? "Google"
        : provider === "discord"
          ? "Discord"
          : "X";

    setConnectionBusy(displayName);
    setConnectionError("");
    setError("");
    setMessage("");

    try {
      await disconnectProfileConnection(
        provider,
      );

      await loadProfile(false);

      setMessage(
        `${displayName} account disconnected successfully.`,
      );
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? err.message
          : `Unable to disconnect ${displayName} account.`,
      );
    } finally {
      setConnectionBusy(null);
    }
  }

  async function handleSettingsSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (settingsSaving) {
      return;
    }

    setSettingsSaving(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const payload = {
        default_driver_comp: defaultDriverComp.trim() || "VER",
        units,
        theme,
        accent_color: accentColor,
        notifications_enabled: notificationsEnabled,
      };

      await updateUserSettings(payload);

      const updatedSettings: UserSettings = {
        default_driver_comp: payload.default_driver_comp,
        units: payload.units,
        theme: payload.theme,
        accent_color: payload.accent_color,
        notifications_enabled: payload.notifications_enabled,
      };

      setUserSettings(updatedSettings);

      saveAppearanceLocally(
        payload.theme,
        payload.accent_color,
      );

      setSettingsMessage(
        "Account settings updated successfully.",
      );
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : "Unable to update account settings.",
      );
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (passwordSaving) {
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    const cleanCurrentPassword =
      currentPassword;

    const cleanNewPassword =
      newPassword;

    const cleanConfirmPassword =
      confirmPassword;

    const hasExistingPassword =
      Boolean(profile?.has_password);

    if (
      hasExistingPassword &&
      !cleanCurrentPassword
    ) {
      setPasswordError(
        "Enter your current password.",
      );
      return;
    }

    if (cleanNewPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters.",
      );
      return;
    }

    if (cleanNewPassword.length > 128) {
      setPasswordError(
        "New password must be 128 characters or fewer.",
      );
      return;
    }

    if (
      cleanNewPassword !==
      cleanConfirmPassword
    ) {
      setPasswordError(
        "New passwords do not match.",
      );
      return;
    }

    if (
      hasExistingPassword &&
      cleanNewPassword ===
        cleanCurrentPassword
    ) {
      setPasswordError(
        "New password must be different from your current password.",
      );
      return;
    }

    setPasswordSaving(true);

    try {
      const result = await changePassword({
        ...(hasExistingPassword
          ? {
              current_password:
                cleanCurrentPassword,
            }
          : {}),
        new_password:
          cleanNewPassword,
        confirm_password:
          cleanConfirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage(
        result.message ||
          (
            hasExistingPassword
              ? "Password changed successfully."
              : "Password set successfully."
          ),
      );

      if (!hasExistingPassword) {
        setProfile((current) =>
          current
            ? {
                ...current,
                has_password: true,
              }
            : current,
        );
      }
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Unable to update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

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

      if (cleanUsername.length < 3) {
        setError("Username must be at least 3 characters.");
        setSaving(false);
        return;
      }

      if (cleanUsername.length > 50) {
        setError("Username must be 50 characters or fewer.");
        setSaving(false);
        return;
      }

      if (!/^[A-Za-z0-9_]+$/.test(cleanUsername)) {
        setError(
          "Username can contain only letters, numbers, and underscores.",
        );
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

              username:
                cleanUsername,

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

          <h1>
            Loading profile...
          </h1>

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

          <h1>
            Profile unavailable.
          </h1>

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

                <span>
                  PRO MEMBER
                </span>
              </>
            ) : (
              <>
                <UserRound size={17} />

                <span>
                  FREE MEMBER
                </span>
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
                {stats?.replays_watched ?? 0}
              </strong>

              <small>
                Completed replay sessions
              </small>
            </div>

            <div className="profile-stat-card">
              <span>
                REPLAYS STARTED
              </span>

              <strong>
                {stats?.replays_started ?? 0}
              </strong>

              <small>
                Replay sessions started
              </small>
            </div>

            <div className="profile-stat-card">
              <span>
                WATCH TIME
              </span>

              <strong>
                {formatWatchTime(
                  stats?.watch_time_seconds ?? 0,
                )}
              </strong>

              <small>
                Total replay watch time
              </small>
            </div>

            <div className="profile-stat-card">
              <span>
                COMPLETION RATE
              </span>

              <strong>
                {Math.round(
                  stats?.completion_rate ?? 0,
                )}%
              </strong>

              <small>
                Replay completion rate
              </small>
            </div>

          </div>

          <div className="profile-membership-row">
            <div>
              <span className="profile-section-label">
                MEMBERSHIP
              </span>

              <strong>
                {profile.is_pro
                  ? "PRO"
                  : "FREE"}
              </strong>
            </div>

            <small>
              Current account status
            </small>
          </div>
        </section>

        {/* 2026 SEASON SUMMARY */}

        <section className="profile-section profile-season-section">

          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                2026 SEASON
              </span>

              <h2>
                Your season
              </h2>
            </div>

            <Trophy size={20} />
          </div>

          {seasonSummaryLoading ? (
            <div className="profile-season-summary-loading">
              <LoaderCircle
                size={18}
                className="profile-loading-spinner"
              />

              <span>
                Loading season summary...
              </span>
            </div>
          ) : seasonSummary ? (
            <div className="profile-season-summary">

              <div className="profile-season-summary-header">

                <div>
                  <p className="profile-season-summary-kicker">
                    SEASON JOURNEY
                  </p>

                  <h3 className="profile-season-summary-title">
                    2026 Championship
                  </h3>
                </div>

                <span className="profile-season-summary-year">
                  26
                </span>

              </div>

              <div className="profile-season-progress">

                <div className="profile-season-progress-meta">
                  <span className="profile-season-progress-label">
                    SEASON EXPLORED
                  </span>

                  <strong className="profile-season-progress-value">
                    {Math.round(
                      seasonSummary.season_progress,
                    )}%
                  </strong>
                </div>

                <div className="profile-season-progress-track">
                  <span
                    style={{
                      width: `${Math.min(
                        Math.max(
                          seasonSummary.season_progress,
                          0,
                        ),
                        100,
                      )}%`,
                    }}
                  />
                </div>

              </div>

              <div className="profile-season-stats">

                <div className="profile-season-stat">
                  <strong className="profile-season-stat-value">
                    {seasonSummary.unique_races}
                  </strong>

                  <span className="profile-season-stat-label">
                    Races explored
                  </span>
                </div>

                <div className="profile-season-stat">
                  <strong className="profile-season-stat-value">
                    {seasonSummary.total_sessions}
                  </strong>

                  <span className="profile-season-stat-label">
                    Sessions watched
                  </span>
                </div>

                <div className="profile-season-stat">
                  <strong className="profile-season-stat-value">
                    {seasonSummary.completed_sessions}
                  </strong>

                  <span className="profile-season-stat-label">
                    Sessions completed
                  </span>
                </div>

                <div className="profile-season-stat">
                  <strong className="profile-season-stat-value">
                    {formatWatchTime(
                      seasonSummary.watch_time_seconds,
                    )}
                  </strong>

                  <span className="profile-season-stat-label">
                    Total watch time
                  </span>
                </div>

              </div>

              <div className="profile-season-highlights">

                {seasonSummary.most_watched && (
                  <div className="profile-season-highlight">

                    <p className="profile-season-highlight-label">
                      MOST WATCHED
                    </p>

                    <div className="profile-season-highlight-main">
                      <strong>
                        Round{" "}
                        {seasonSummary.most_watched.round}
                      </strong>

                      <span>
                        {formatWatchTime(
                          seasonSummary.most_watched
                            .watch_time_seconds,
                        )}
                      </span>
                    </div>

                    <div className="profile-season-highlight-meta">
                      <span>
                        2026 GRAND PRIX
                      </span>
                    </div>

                  </div>
                )}

                {seasonSummary.latest_replay && (
                  <div className="profile-season-highlight">

                    <p className="profile-season-highlight-label">
                      LATEST REPLAY
                    </p>

                    <div className="profile-season-highlight-main">
                      <strong>
                        Round{" "}
                        {seasonSummary.latest_replay.round}
                      </strong>

                      <span>
                        {Math.round(
                          seasonSummary.latest_replay.progress *
                            100,
                        )}%
                      </span>
                    </div>

                    <div className="profile-season-highlight-meta">
                      <span>
                        {seasonSummary.latest_replay.session_type}
                      </span>

                      <span>
                        ·
                      </span>

                      <span>
                        {seasonSummary.latest_replay.progress >=
                        0.999
                          ? "COMPLETED"
                          : "IN PROGRESS"}
                      </span>
                    </div>

                  </div>
                )}

              </div>

              <div className="profile-season-completion">

                <span>
                  COMPLETION RATE
                </span>

                <strong>
                  {Math.round(
                    seasonSummary.completion_rate,
                  )}%
                </strong>

              </div>

            </div>
          ) : (
            <div className="profile-loading-state">
              <CircleOff size={20} />

              <span>
                Season summary unavailable.
              </span>
            </div>
          )}

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

        {/* ACHIEVEMENTS */}

        <section className="profile-section profile-achievements-section">
          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                ACHIEVEMENTS
              </span>

              <h2>
                Replay milestones
              </h2>
            </div>

            <Trophy size={20} />
          </div>

          {achievementsLoading ? (
            <div className="profile-achievements-loading">
              <LoaderCircle
                size={18}
                className="profile-button-spinner"
              />

              LOADING ACHIEVEMENTS...
            </div>
          ) : (
            <div className="profile-achievements-grid">

              {achievements.map((achievement) => {
                const progressPercent =
                  achievement.target > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (achievement.progress /
                            achievement.target) *
                            100,
                        ),
                      )
                    : 0;

                return (
                  <article
                    key={achievement.key}
                    className={`profile-achievement-card ${
                      achievement.unlocked
                        ? "is-unlocked"
                        : "is-locked"
                    }`}
                  >

                    <div className="profile-achievement-top">

                      <div className="profile-achievement-icon">
                        {achievement.unlocked ? (
                          <Trophy size={20} />
                        ) : (
                          <LockKeyhole size={19} />
                        )}
                      </div>

                      <span
                        className={`profile-achievement-status ${
                          achievement.unlocked
                            ? "is-unlocked"
                            : "is-locked"
                        }`}
                      >
                        {achievement.unlocked
                          ? "UNLOCKED"
                          : "LOCKED"}
                      </span>

                    </div>

                    <div className="profile-achievement-body">

                      <strong>
                        {achievement.title}
                      </strong>

                      <p>
                        {achievement.description}
                      </p>

                    </div>

                    <div className="profile-achievement-progress">

                      <div className="profile-achievement-progress-meta">
                        <span>
                          PROGRESS
                        </span>

                        <strong>
                          {achievement.progress_label}
                        </strong>
                      </div>

                      <div className="profile-achievement-progress-track">
                        <span
                          style={{
                            width: `${progressPercent}%`,
                          }}
                        />
                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

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

            <ShieldCheck size={20} />
          </div>

          {connectionError && (
            <div className="profile-form-error">
              {connectionError}
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

          <div className="profile-connections">

            {profile.connected_accounts.google && (
              <ConnectionRow
                name="Google"
                connected={true}
                busy={connectionBusy === "Google"}
                onDisconnect={() =>
                  handleDisconnect("google")
                }
              />
            )}

            {profile.connected_accounts.discord && (
              <ConnectionRow
                name="Discord"
                connected={true}
                busy={connectionBusy === "Discord"}
                onDisconnect={() =>
                  handleDisconnect("discord")
                }
              />
            )}

            {profile.connected_accounts.x && (
              <ConnectionRow
                name="X"
                connected={true}
                busy={connectionBusy === "X"}
                onDisconnect={() =>
                  handleDisconnect("x")
                }
              />
            )}

            {!profile.connected_accounts.google &&
              !profile.connected_accounts.discord &&
              !profile.connected_accounts.x && (
                <div className="profile-connections-empty">
                  NO ACCOUNTS CONNECTED
                </div>
              )}

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

        {/* ACCOUNT SETTINGS */}

        <section className="profile-section">
          <div className="profile-section-heading">
            <div>
              <span className="profile-section-label">
                ACCOUNT SETTINGS
              </span>

              <h2>
                Preferences
              </h2>
            </div>

            <UserRound size={20} />
          </div>

          {settingsLoading ? (
            <div className="profile-security-card">
              <div>
                <strong>
                  Loading settings
                </strong>

                <p>
                  Retrieving your account preferences...
                </p>
              </div>

              <LoaderCircle
                size={20}
                className="profile-button-spinner"
              />
            </div>
          ) : (
            <form
              className="profile-form"
              onSubmit={handleSettingsSubmit}
            >
              <div className="profile-form-grid">

                <label className="profile-field">
                  <span>
                    DEFAULT DRIVER COMPARISON
                  </span>

                  <select
                    value={defaultDriverComp}
                    onChange={(event) =>
                      setDefaultDriverComp(
                        event.target.value,
                      )
                    }
                  >
                    <option value="VER">
                      VER — Max Verstappen
                    </option>

                    <option value="NOR">
                      NOR — Lando Norris
                    </option>

                    <option value="LEC">
                      LEC — Charles Leclerc
                    </option>

                    <option value="HAM">
                      HAM — Lewis Hamilton
                    </option>

                    <option value="ANT">
                      ANT — Kimi Antonelli
                    </option>

                    <option value="PIA">
                      PIA — Oscar Piastri
                    </option>

                    <option value="RUS">
                      RUS — George Russell
                    </option>
                  </select>
                </label>

                <label className="profile-field">
                  <span>
                    UNITS
                  </span>

                  <select
                    value={units}
                    onChange={(event) =>
                      setUnits(event.target.value)
                    }
                  >
                    <option value="metric">
                      Metric
                    </option>

                    <option value="imperial">
                      Imperial
                    </option>
                  </select>
                </label>

              </div>

              <div className="profile-form-grid">

                <label className="profile-field">
                  <span>
                    THEME
                  </span>

                  <select
                    value={theme}
                    onChange={(event) =>
                      setTheme(event.target.value)
                    }
                  >
                    <option value="dark">
                      Dark
                    </option>

                    <option value="light">
                      Light
                    </option>

                    <option value="system">
                      System
                    </option>
                  </select>
                </label>

                <label className="profile-field">
                  <span>
                    ACCENT COLOR
                  </span>

                  <select
                    value={accentColor}
                    onChange={(event) =>
                      setAccentColor(event.target.value)
                    }
                  >
                    <option value="#e10600">
                      F1 Red
                    </option>

                    <option value="#ff1744">
                      Crimson
                    </option>

                    <option value="#ffffff">
                      White
                    </option>
                  </select>
                </label>

              </div>

              <label className="profile-settings-toggle">
                <span>
                  <strong>
                    REPLAY NOTIFICATIONS
                  </strong>

                  <small>
                    Receive notifications about replay activity
                    and updates.
                  </small>
                </span>

                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(event) =>
                    setNotificationsEnabled(
                      event.target.checked,
                    )
                  }
                />
              </label>

              {settingsError && (
                <div className="profile-form-error">
                  {settingsError}
                </div>
              )}

              {settingsMessage && (
                <div className="profile-form-success">
                  <CheckCircle2 size={16} />

                  <span>
                    {settingsMessage}
                  </span>
                </div>
              )}

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={settingsSaving}
                >
                  {settingsSaving ? (
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

                      SAVE SETTINGS
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
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

          <form
            className="profile-form profile-password-form"
            onSubmit={handlePasswordSubmit}
          >
            <div className="profile-security-card">
              <div>
                <strong>
                  {profile?.has_password
                    ? "Change your password"
                    : "Set a password"}
                </strong>

                <p>
                  {profile?.has_password
                    ? "Use a strong password to keep your F1 Race Replay account protected."
                    : "Create a password so you can also sign in directly with your F1 Race Replay account."}
                </p>
              </div>

              <ShieldCheck size={22} />
            </div>

            <div className="profile-form-grid">

              {profile?.has_password && (
                <label className="profile-field">
                  <span>
                    CURRENT PASSWORD
                  </span>

                  <div className="profile-password-input">
                    <input
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(
                          event.target.value,
                        )
                      }
                      autoComplete="current-password"
                      placeholder="Enter current password"
                    />

                    <button
                      type="button"
                      className="profile-password-toggle"
                      aria-label={
                        showCurrentPassword
                          ? "Hide current password"
                          : "Show current password"
                      }
                      onClick={() =>
                        setShowCurrentPassword(
                          (current) => !current,
                        )
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>
              )}

              <label className="profile-field">
                <span>
                  NEW PASSWORD
                </span>

                <div className="profile-password-input">
                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                  />

                  <button
                    type="button"
                    className="profile-password-toggle"
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                    onClick={() =>
                      setShowNewPassword(
                        (current) => !current,
                      )
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

            </div>

            <div className="profile-form-grid">

              <label className="profile-field">
                <span>
                  CONFIRM NEW PASSWORD
                </span>

                <div className="profile-password-input">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />

                  <button
                    type="button"
                    className="profile-password-toggle"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current,
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </label>

            </div>

            <div className="profile-password-hint">
              <LockKeyhole size={15} />

              <span>
                Passwords must contain at least 8 characters.
              </span>
            </div>

            {passwordError && (
              <div className="profile-form-error">
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div className="profile-form-success">
                <CheckCircle2 size={16} />

                <span>
                  {passwordMessage}
                </span>
              </div>
            )}

            <div className="profile-form-actions">

              <button
                type="submit"
                className="profile-save-button"
                disabled={passwordSaving}
              >
                {passwordSaving ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="profile-button-spinner"
                    />

                    {profile?.has_password
                      ? "UPDATING..."
                      : "SETTING PASSWORD..."}
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} />

                    {profile?.has_password
                      ? "CHANGE PASSWORD"
                      : "SET PASSWORD"}
                  </>
                )}
              </button>

            </div>
          </form>
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
  busy?: boolean;
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
};

function ProviderIcon({
  provider,
}: {
  provider: string;
}) {
  if (provider === "Google") {
    return (
      <svg
        className="profile-provider-svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M21.35 12.27c0-.72-.06-1.41-.18-2.07H12v3.92h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.24Z"
        />

        <path
          fill="currentColor"
          d="M12 21.68c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.68Z"
        />

        <path
          fill="currentColor"
          d="M6.54 13.77A5.86 5.86 0 0 1 6.23 12c0-.61.11-1.2.31-1.77V7.7H3.3A9.74 9.74 0 0 0 2.27 12c0 1.57.38 3.05 1.03 4.3l3.24-2.53Z"
        />

        <path
          fill="currentColor"
          d="M12 6.2c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.29 14.62 2.32 12 2.32A9.74 9.74 0 0 0 3.3 7.7l3.24 2.53C7.31 7.92 9.46 6.2 12 6.2Z"
        />
      </svg>
    );
  }

  if (provider === "Discord") {
    return (
      <svg
        className="profile-provider-svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M19.54 5.01A16.7 16.7 0 0 0 15.5 3.75l-.49 1a15.16 15.16 0 0 0-6.02 0l-.49-1a16.75 16.75 0 0 0-4.04 1.26C1.9 8.93 1.2 12.77 1.55 16.56a16.67 16.67 0 0 0 5.13 2.6l1.25-1.7c-.68-.25-1.33-.56-1.94-.92l.47-.36c3.74 1.75 7.79 1.75 11.48 0l.48.36c-.61.36-1.26.67-1.94.92l1.25 1.7a16.67 16.67 0 0 0 5.13-2.6c.41-4.39-.7-8.19-3.32-11.55ZM8.18 14.37c-1.1 0-2-.99-2-2.21s.88-2.21 2-2.21 2 .99 2 2.21-.9 2.21-2 2.21Zm7.64 0c-1.1 0-2-.99-2-2.21s.88-2.21 2-2.21 2 .99 2 2.21-.9 2.21-2 2.21Z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="profile-provider-svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M18.9 2H22l-6.77 7.74L23.2 22h-6.25l-4.9-6.93L5.98 22H2.86l7.24-8.28L2.2 2h6.41l4.43 6.39L18.9 2Zm-1.1 17.88h1.73L7.7 4H5.84l11.96 15.88Z"
      />
    </svg>
  );
}

function ConnectionRow({
  name,
  connected,
  busy = false,
  onConnect,
  onDisconnect,
}: ConnectionRowProps) {
  return (
    <div className="profile-connection-row">

      <div className="profile-connection-name">

        <span
          className={`profile-connection-icon provider-${name.toLowerCase()}`}
        >
          <ProviderIcon
            provider={name}
          />
        </span>

        <span>
          {name}
        </span>

      </div>

      <div className="profile-connection-actions">

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

        {connected && onDisconnect && (
          <button
            type="button"
            className="profile-connection-button profile-connection-button-danger"
            onClick={onDisconnect}
            disabled={busy}
          >
            {busy ? (
              <>
                <LoaderCircle
                  size={14}
                  className="profile-button-spinner"
                />

                DISCONNECTING...
              </>
            ) : (
              "DISCONNECT"
            )}
          </button>
        )}

        {!connected && onConnect && (
          <button
            type="button"
            className="profile-connection-button"
            onClick={onConnect}
            disabled={busy}
          >
            {busy ? (
              <>
                <LoaderCircle
                  size={14}
                  className="profile-button-spinner"
                />

                CONNECTING...
              </>
            ) : (
              "CONNECT"
            )}
          </button>
        )}

      </div>

    </div>
  );
}