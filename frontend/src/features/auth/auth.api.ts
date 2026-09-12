import type {
  AuthResponse,
  AuthUser,
  GooglePayload,
  LoginPayload,
  SignupPayload,
} from "./auth.types";

const AUTH_BASE = "/auth";
const ACCESS_TOKEN_KEY = "f1_access_token";

/* =========================================================
   PROFILE TYPES
========================================================= */

export interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  picture_url: string | null;
  is_pro: boolean;
  has_password: boolean;
  favorite_driver: string | null;
  favorite_team: string | null;
  replays_watched: number;
  connected_accounts: {
    google: boolean;
    discord: boolean;
    x: boolean;
  };
}

export interface UpdateProfilePayload {
  username?: string;
  favorite_driver?: string;
  favorite_team?: string;
}

/* =========================================================
   AUTH REQUEST
========================================================= */

async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    localStorage.getItem(ACCESS_TOKEN_KEY);

  const response = await fetch(
    `${AUTH_BASE}${endpoint}`,
    {
      credentials: "include",

      ...options,

      headers: {
        Accept: "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...options.headers,
      },
    },
  );

  const contentType =
    response.headers.get("content-type") ?? "";

  const data =
    contentType.includes("application/json")
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    let message =
      `Auth request failed (${response.status})`;

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      message = data.detail;
    }

    throw new Error(message);
  }

  return data as T;
}

/* =========================================================
   SIGN UP
========================================================= */

export function signup(
  payload: SignupPayload,
) {
  return authRequest<AuthResponse>(
    "/signup",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

/* =========================================================
   LOGIN
========================================================= */

export function login(
  payload: LoginPayload,
) {
  return authRequest<AuthResponse>(
    "/login",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

/* =========================================================
   GOOGLE LOGIN
========================================================= */

export function googleLogin(
  payload: GooglePayload,
) {
  return authRequest<AuthResponse>(
    "/google",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_token: payload.id_token,
      }),
    },
  );
}


export function getCurrentUser() {
  return authRequest<AuthUser>("/me");
}

export function logout() {
  return authRequest<{ detail: string }>(
    "/logout",
    {
      method: "POST",
    },
  );
}

export interface ProfileConnections {
  email: boolean;
  google: boolean;
  discord: boolean;
  x: boolean;
}

export function getProfileConnections() {
  return authRequest<ProfileConnections>(
    "/profile/connections",
  );
}

export function connectGoogleAccount(
  idToken: string,
) {
  return authRequest<{
    message: string;
    provider: string;
    connected: boolean;
  }>(
    "/profile/connections/google",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_token: idToken,
      }),
    },
  );
}


export async function startDiscordConnection() {
  return authRequest<{
    authorization_url: string;
  }>("/profile/connections/discord/start");
}


export function disconnectProfileConnection(
  provider: "google" | "discord" | "x",
) {
  return authRequest<{
    message: string;
    provider: string;
    connected: boolean;
  }>(
    `/profile/connections/${provider}`,
    {
      method: "DELETE",
    },
  );
}


export function getProfile() {
  return authRequest<UserProfile>(
    "/profile",
  );
}

export function updateProfile(
  payload: UpdateProfilePayload,
) {
  return authRequest<{
    message: string;
    username: string;
  }>(
    "/profile",
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export interface ChangePasswordPayload {
  current_password?: string;
  new_password: string;
  confirm_password: string;
}

export function changePassword(
  payload: ChangePasswordPayload,
) {
  return authRequest<{
    message: string;
  }>(
    "/profile/password",
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export interface ProfileStats {
  replays_watched: number;
  replays_started: number;
  watch_time_seconds: number;
  completion_rate: number;
}

export interface SeasonSummary {
  year: number;
  total_sessions: number;
  completed_sessions: number;
  unique_races: number;
  watch_time_seconds: number;
  completion_rate: number;
  season_progress: number;
  most_watched: {
    year: number;
    round: number;
    watch_time_seconds: number;
  } | null;
  latest_replay: {
    year: number;
    round: number;
    session_type: string;
    progress: number;
    last_watched_at: string | null;
  } | null;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  progress_label: string;
}

export function getSeasonSummary(): Promise<SeasonSummary> {
  return authRequest<SeasonSummary>("/profile/season-summary");
}

export async function getAchievements(): Promise<Achievement[]> {
  const data = await authRequest<unknown>("/achievements");

  if (Array.isArray(data)) {
    return data as Achievement[];
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "achievements" in data &&
    Array.isArray((data as { achievements: unknown }).achievements)
  ) {
    return (data as { achievements: Achievement[] }).achievements;
  }

  console.error("[getAchievements] Unexpected API response:", data);
  return [];
}

export async function getProfileStats(): Promise<ProfileStats> {
  return authRequest<ProfileStats>("/profile/stats");
}

/* =========================================================
   USER SETTINGS
========================================================= */

export interface UserSettings {
  default_driver_comp: string;
  units: string;
  theme: string;
  accent_color: string;
  notifications_enabled: boolean;
}

export interface UpdateUserSettingsPayload {
  default_driver_comp?: string;
  units?: string;
  theme?: string;
  accent_color?: string;
  notifications_enabled?: boolean;
}

export function getUserSettings(): Promise<UserSettings> {
  return authRequest<UserSettings>("/settings");
}

export function updateUserSettings(
  payload: UpdateUserSettingsPayload,
): Promise<{
  message: string;
  units: string;
}> {
  return authRequest<{
    message: string;
    units: string;
  }>("/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

