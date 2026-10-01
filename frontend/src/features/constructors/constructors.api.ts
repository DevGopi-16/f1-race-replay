import type { ConstructorsPanelResponse } from "./constructors.types";
import { API_BASE_URL } from "../../api/config";

export async function getConstructorsPanel(
  year: number,
  round?: number,
): Promise<ConstructorsPanelResponse> {
  const params = new URLSearchParams({
    year: String(year),
  });

  if (round != null) {
    params.set("round", String(round));
  }

  const response = await fetch(
    `${API_BASE_URL}/api/constructors/panel?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Constructors API failed: ${response.status}`);
  }

  return response.json();
}

export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/images/")) {
    return path;
  }

  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}