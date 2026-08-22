const API_BASE_URL = "/api";

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
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      credentials: "include",

      ...options,

      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    },
  );

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

      headers: {
        "Content-Type": "application/json",
      },

      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );
}
