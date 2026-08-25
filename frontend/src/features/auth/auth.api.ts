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
  favorite_driver: string;
  favorite_team: string;
  replays_watched: number;
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
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

/* =========================================================
   CURRENT USER
========================================================= */

export function getCurrentUser() {
  return authRequest<AuthUser>("/me");
}

/* =========================================================
   LOGOUT
========================================================= */

export function logout() {
  return authRequest<{ detail: string }>(
    "/logout",
    {
      method: "POST",
    },
  );
}

/* =========================================================
   PROFILE
========================================================= */

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