/**
 * Shared 401 -> refresh -> retry logic for both low-level fetch wrappers
 * (client.ts's apiRequest and auth.api.ts's authRequest).
 *
 * Single-flight: if multiple requests hit 401 at the same time, only one
 * POST /auth/refresh goes out; every other caller awaits that same
 * promise. Without this, two simultaneous 401s would each try to rotate
 * the refresh token cookie — refresh tokens are single-use, so the
 * second rotation would invalidate the first and log the user out.
 */

let refreshPromise: Promise<boolean> | null = null;

// A 401 on these means "wrong credential" or "this IS the refresh call
// itself" — never retry these through the refresh flow.
const SKIP_REFRESH_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/google",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

export function shouldSkipRefresh(url: string): boolean {
  return SKIP_REFRESH_PATHS.some((path) => url.startsWith(path));
}

type AuthExpiredHandler = () => void;
let onAuthExpired: AuthExpiredHandler | null = null;

/** auth.store registers this once, to be notified when a refresh attempt
 * fails (session truly gone) so it can clear local user state. A
 * callback, not an import, to avoid a circular dependency: auth.store
 * imports auth.api, which needs this file. */
export function setOnAuthExpired(handler: AuthExpiredHandler) {
  onAuthExpired = handler;
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      return true;
    }
  } catch {
    // network error — treat as failed refresh, fall through
  }

  onAuthExpired?.();
  return false;
}

/** Ensures only one refresh is in flight at a time; every caller gets
 * the result of that single request. */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}