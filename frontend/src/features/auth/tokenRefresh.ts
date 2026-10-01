










let refreshPromise: Promise<boolean> | null = null;



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





export function setOnAuthExpired(handler: AuthExpiredHandler) {
  onAuthExpired = handler;
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      return true;
    }
  } catch {

  }

  onAuthExpired?.();
  return false;
}



export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
import { API_BASE_URL } from "../../api/config";
