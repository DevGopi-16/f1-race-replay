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
  Monitor,
  LogOut,
} from "lucide-react";

import {
  getProfile,
  getProfileStats,
  getAchievements,
  getSeasonSummary,
  changePassword,
  getUserSettings,
  updateUserSettings,
  getSessions,
  revokeSession,
  forgotPassword,
  type UserProfile,
  type ProfileStats,
  type Achievement,
  type SeasonSummary,
  type UserSettings,
  type UserSession,
} from "./auth.api";

import "./profile.css";
import { saveAppearanceLocally } from "./appearance";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown";

  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

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

  const [error, setError] =
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

  const [sessions, setSessions] =
    useState<UserSession[] | null>(null);

  const [sessionsError, setSessionsError] =
    useState("");

  const [revokingSessionId, setRevokingSessionId] =
    useState<number | null>(null);

  const [forgotSending, setForgotSending] =
    useState(false);

  const [forgotMessage, setForgotMessage] =
    useState("");

  async function handleForgotPassword() {
    if (!profile?.email) {
      setPasswordError(
        "No email is on file for this account, so a reset link can't be sent.",
      );
      return;
    }

    setForgotSending(true);
    setPasswordError("");
    setForgotMessage("");

    try {
      await forgotPassword(profile.email);
      setForgotMessage(
        "If this email is on your account, a reset link has been sent. Check your inbox.",
      );
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Unable to send a reset link right now.",
      );
    } finally {
      setForgotSending(false);
    }
  }

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

    getSessions()
      .then((data) => {
        if (active) {
          setSessions(data);
        }
      })
      .catch((err) => {
        if (active) {
          setSessionsError(
            err instanceof Error
              ? err.message
              : "Unable to load your sessions.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleRevokeSession(sessionId: number) {
    setRevokingSessionId(sessionId);
    setSessionsError("");

    try {
      await revokeSession(sessionId);
      setSessions(
        (current) =>
          current?.filter((s) => s.id !== sessionId) ?? null,
      );
    } catch (err) {
      setSessionsError(
        err instanceof Error
          ? err.message
          : "Unable to revoke that session.",
      );
    } finally {
      setRevokingSessionId(null);
    }
  }

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

  const profileCompletion =
    Math.min(
      100,
      Math.max(
        0,
        Math.round((stats?.completion_rate ?? 0) + (profile.is_pro ? 6 : 0)),
      ),
    );

  const metricCards = [
    {
      label: "PROFILE COMPLETION",
      value: `${profileCompletion}%`,
      helper: profile.favorite_driver
        ? `Fav. driver: ${profile.favorite_driver}`
        : "No favorite driver selected",
    },
    {
      label: "WATCH TIME",
      value: formatWatchTime(stats?.watch_time_seconds ?? 0),
      helper: `${stats?.replays_watched ?? 0} replays watched`,
    },
    {
      label: "SEASON PROGRESS",
      value: `${Math.round(seasonSummary?.season_progress ?? 0)}%`,
      helper: seasonSummary
        ? `${seasonSummary.completed_sessions} sessions completed`
        : "Season summary loading",
    },
    {
      label: "PREFERRED TEAM",
      value: profile.favorite_team || "Not set",
      helper: profile.favorite_driver || "Add your race preference",
    },
  ];

  return (
    <main className="profile-page">
      <div className="profile-page-glow" />

      <div className="profile-shell">

        {                 }

        <header className="profile-header">
          <div className="profile-header-copy">
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

          <div className="profile-header-actions">
            <span className="profile-mini-pill profile-mini-pill-live">
              {profile.is_pro ? "PRO MEMBER" : "FREE MEMBER"}
            </span>
            <span className="profile-mini-pill">
              {new Date().getFullYear()} season
            </span>
          </div>
        </header>

        <div className="profile-layout">

          {             }

          <aside className="profile-sidebar">

            {                  }

            <section className="profile-card profile-hero">

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

              <div className="profile-hero-meta">
                <span className="profile-hero-badge is-live">
                  <span className="profile-badge-dot" />
                  Online now
                </span>
                <span className="profile-hero-badge">
                  2026 season live
                </span>
              </div>

              <div className="profile-hero-kpis">
                <div className="profile-kpi-tile">
                  <span>Win rate</span>
                  <strong>{Math.round(stats?.completion_rate ?? 0)}%</strong>
                </div>
                <div className="profile-kpi-tile">
                  <span>Watch time</span>
                  <strong>{formatWatchTime(stats?.watch_time_seconds ?? 0)}</strong>
                </div>
              </div>

            </section>

            {                      }

            <section className="profile-section profile-overview-card">
              <div className="profile-section-heading">
                <div>
                  <span className="profile-section-label">
                    ACCOUNT OVERVIEW
                  </span>

                  <h2>
                    Your account
                  </h2>
                </div>

                <ShieldCheck size={18} />
              </div>

              <div className="profile-overview-list">

                <div className="profile-overview-row">
                  <span>
                    Replays watched
                  </span>

                  <strong>
                    {stats?.replays_watched ?? 0}
                  </strong>
                </div>

                <div className="profile-overview-row">
                  <span>
                    Replays started
                  </span>

                  <strong>
                    {stats?.replays_started ?? 0}
                  </strong>
                </div>

                <div className="profile-overview-row">
                  <span>
                    Watch time
                  </span>

                  <strong>
                    {formatWatchTime(
                      stats?.watch_time_seconds ?? 0,
                    )}
                  </strong>
                </div>

                <div className="profile-overview-row">
                  <span>
                    Completion rate
                  </span>

                  <strong>
                    {Math.round(
                      stats?.completion_rate ?? 0,
                    )}%
                  </strong>
                </div>

                <div className="profile-overview-row profile-overview-row-membership">
                  <span>
                    Membership
                  </span>

                  <strong>
                    {profile.is_pro
                      ? "PRO"
                      : "FREE"}
                  </strong>
                </div>

              </div>
            </section>

          </aside>

          {                  }

          <div className="profile-main">

            <section className="profile-section profile-span-2 profile-dashboard-strip">
              <div className="profile-section-heading">
                <div>
                  <span className="profile-section-label">
                    QUICK OVERVIEW
                  </span>

                  <h2>
                    Race intelligence
                  </h2>
                </div>

                <Flag size={20} />
              </div>

              <div className="profile-metric-grid">
                {metricCards.map((metric) => (
                  <div
                    key={metric.label}
                    className="profile-metric-card"
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.helper}</small>
                  </div>
                ))}
              </div>
            </section>

            {                         }

            <section className="profile-section profile-span-2 profile-season-section">

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

            {                  }

            <section className="profile-section profile-span-2 profile-achievements-section">
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

            {                      }

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

            {              }

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

                  {profile?.has_password && (
                    <button
                      type="button"
                      className="profile-forgot-link"
                      onClick={handleForgotPassword}
                      disabled={forgotSending}
                    >
                      {forgotSending
                        ? "Sending reset link..."
                        : "Forgot your password?"}
                    </button>
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

                {forgotMessage && (
                  <div className="profile-form-success">
                    <CheckCircle2 size={16} />
                    <span>{forgotMessage}</span>
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

            {              }

            <section className="profile-section">
              <div className="profile-section-heading">
                <div>
                  <span className="profile-section-label">
                    ACTIVE SESSIONS
                  </span>

                  <h2>
                    Signed-in devices
                  </h2>
                </div>

                <Monitor size={20} />
              </div>

              {sessionsError && (
                <div className="profile-form-error">
                  {sessionsError}
                </div>
              )}

              {sessions === null && !sessionsError && (
                <div className="profile-security-card">
                  <div>
                    <strong>
                      Loading sessions
                    </strong>

                    <p>
                      Retrieving your active sessions...
                    </p>
                  </div>

                  <LoaderCircle
                    size={20}
                    className="profile-button-spinner"
                  />
                </div>
              )}

              {sessions !== null && sessions.length === 0 && (
                <div className="profile-security-card">
                  <div>
                    <strong>
                      No active sessions
                    </strong>

                    <p>
                      You're not signed in anywhere right now.
                    </p>
                  </div>
                </div>
              )}

              {sessions !== null &&
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="profile-security-card"
                  >
                    <div>
                      <strong>
                        {session.device}
                        {session.is_current && (
                          <span className="profile-mini-pill profile-mini-pill-live" style={{ marginLeft: 10 }}>
                            THIS DEVICE
                          </span>
                        )}
                      </strong>

                      <p>
                        Signed in {formatRelativeTime(session.signed_in_at)}
                        {" · "}
                        Last active {formatRelativeTime(session.last_active_at)}
                        {session.ip_address && (
                          <>
                            {" · "}
                            {session.ip_address}
                          </>
                        )}
                      </p>
                    </div>

                    {!session.is_current && (
                      <button
                        type="button"
                        className="profile-save-button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSessionId === session.id}
                      >
                        {revokingSessionId === session.id ? (
                          <LoaderCircle
                            size={17}
                            className="profile-button-spinner"
                          />
                        ) : (
                          <>
                            <LogOut size={17} />
                            REVOKE
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
            </section>

          </div>

        </div>

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
