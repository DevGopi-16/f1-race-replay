import { refreshAccessToken, shouldSkipRefresh } from "../features/auth/tokenRefresh";
import { API_BASE_URL } from "./config";

export { API_BASE_URL } from "./config";


export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function parseResponse(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const headers = new Headers(
    options.headers,
  );

  headers.set(
    "Accept",
    "application/json",
  );

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  if (
    response.status === 401 &&
    !_isRetry &&
    !shouldSkipRefresh(endpoint)
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(endpoint, options, true);
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    let message =
      `API request failed (${response.status})`;

    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      message = data.detail;
    }

    throw new ApiError(
      message,
      response.status,
      data,
    );
  }

  return data as T;
}

export function apiGet<T>(
  endpoint: string,
) {
  return apiRequest<T>(endpoint);
}

export function apiPost<T>(
  endpoint: string,
  body?: unknown,
) {
  return apiRequest<T>(
    endpoint,
    {
      method: "POST",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );
}